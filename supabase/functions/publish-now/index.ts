import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function refreshXToken(
  supabase: ReturnType<typeof createClient>,
  connection: { id: string; user_id: string; refresh_token: string }
): Promise<{ access_token: string } | null> {
  const clientId = Deno.env.get("X_CLIENT_ID");
  const clientSecret = Deno.env.get("X_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
    }),
  });

  const data = await response.json();
  if (!response.ok) return null;

  const expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();
  await supabase.from("platform_connections").update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || connection.refresh_token,
    expires_at: expiresAt,
    token_type: data.token_type || "bearer",
  }).eq("id", connection.id);

  return { access_token: data.access_token };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const { content_id } = await req.json();

    if (!content_id || typeof content_id !== "string") {
      return new Response(JSON.stringify({ error: "content_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch the content - must belong to user, be approved, not yet published
    const { data: contentItem, error: contentError } = await supabase
      .from("content")
      .select("id, user_id, platform, content_text, status, published_at")
      .eq("id", content_id)
      .eq("user_id", userId)
      .single();

    if (contentError || !contentItem) {
      return new Response(JSON.stringify({ error: "Content not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contentItem.status !== "approved") {
      return new Response(JSON.stringify({ error: `Content status is '${contentItem.status}', must be 'approved'` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contentItem.published_at) {
      return new Response(JSON.stringify({ error: "Content already published" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (contentItem.platform !== "x") {
      return new Response(JSON.stringify({ error: "Manual publish only supported for X" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check live posting
    if (Deno.env.get("LIVE_X_POSTING") !== "true") {
      return new Response(JSON.stringify({ error: "Live X posting is disabled (LIVE_X_POSTING != true)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch X connection
    const { data: connection } = await supabase
      .from("platform_connections")
      .select("id, user_id, connected, access_token, refresh_token, expires_at, account_name")
      .eq("user_id", userId)
      .eq("platform", "x")
      .eq("connected", true)
      .single();

    if (!connection || !connection.access_token) {
      return new Response(JSON.stringify({ error: "X account not connected or missing token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if needed
    let accessToken = connection.access_token;
    if (connection.expires_at) {
      const expiresAt = new Date(connection.expires_at);
      if (expiresAt < new Date(Date.now() + 5 * 60 * 1000) && connection.refresh_token) {
        const refreshed = await refreshXToken(supabase, {
          id: connection.id, user_id: userId, refresh_token: connection.refresh_token,
        });
        if (refreshed) {
          accessToken = refreshed.access_token;
        } else {
          return new Response(JSON.stringify({ error: "Token expired and refresh failed" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Post to X
    console.log(`[ManualPublish] Posting tweet for user ${userId} | content=${content_id}`);

    const tweetResponse = await fetch("https://api.x.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: contentItem.content_text }),
    });

    const tweetData = await tweetResponse.json();

    if (!tweetResponse.ok) {
      const errorDetail = tweetData.detail || tweetData.title || JSON.stringify(tweetData);
      const failureReason = `X API ${tweetResponse.status}: ${errorDetail}`;

      await supabase.from("content").update({
        status: "failed",
        failure_reason: failureReason,
      }).eq("id", content_id).eq("status", "approved");

      console.error(`[ManualPublish] Failed | content=${content_id}: ${failureReason}`);

      return new Response(JSON.stringify({ error: failureReason }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tweetId = tweetData.data?.id;
    const username = connection.account_name?.replace("@", "") || "i";
    const tweetUrl = `https://x.com/${username}/status/${tweetId}`;

    // Update content
    await supabase.from("content").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: tweetId,
      external_url: tweetUrl,
    }).eq("id", content_id).eq("status", "approved").is("published_at", null);

    console.log(`[ManualPublish] Success | content=${content_id} tweet=${tweetId} url=${tweetUrl}`);

    return new Response(JSON.stringify({ 
      success: true, 
      tweet_id: tweetId, 
      tweet_url: tweetUrl,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[ManualPublish] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
