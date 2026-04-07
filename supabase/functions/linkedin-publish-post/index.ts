import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function refreshLinkedInToken(
  supabase: ReturnType<typeof createClient>,
  connection: { id: string; refresh_token: string }
): Promise<{ access_token: string } | null> {
  const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
  const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET");
  if (!clientId || !clientSecret) return null;

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: connection.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();
  if (!response.ok) return null;

  const expiresAt = new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString();
  await supabase.from("platform_connections").update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || connection.refresh_token,
    expires_at: expiresAt,
    token_type: data.token_type || "Bearer",
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

    const { content_id } = await req.json();
    if (!content_id) {
      return new Response(JSON.stringify({ error: "content_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch content
    const { data: contentItem, error: contentError } = await supabase
      .from("content")
      .select("id, user_id, platform, content_text, status, published_at, app_id")
      .eq("id", content_id)
      .eq("user_id", user.id)
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

    // Get LinkedIn connection (app-specific first, then user-level fallback)
    const { data: appConn } = await supabase
      .from("platform_connections")
      .select("id, access_token, refresh_token, expires_at, account_name, account_id")
      .eq("user_id", user.id)
      .eq("platform", "linkedin")
      .eq("connected", true)
      .eq("app_id", contentItem.app_id)
      .single();

    let connection = appConn;
    if (!connection) {
      const { data: userConn } = await supabase
        .from("platform_connections")
        .select("id, access_token, refresh_token, expires_at, account_name, account_id")
        .eq("user_id", user.id)
        .eq("platform", "linkedin")
        .eq("connected", true)
        .is("app_id", null)
        .single();
      connection = userConn;
    }

    if (!connection || !connection.access_token) {
      return new Response(JSON.stringify({ error: "LinkedIn not connected or missing token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if expiring soon
    let accessToken = connection.access_token;
    if (connection.expires_at) {
      const expiresAt = new Date(connection.expires_at);
      if (expiresAt < new Date(Date.now() + 5 * 60 * 1000) && connection.refresh_token) {
        const refreshed = await refreshLinkedInToken(supabase, {
          id: connection.id,
          refresh_token: connection.refresh_token,
        });
        if (refreshed) {
          accessToken = refreshed.access_token;
        } else {
          return new Response(JSON.stringify({ error: "LinkedIn token expired and refresh failed" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // The account_id from LinkedIn OIDC is the `sub` claim (a member URN like a numeric string)
    // LinkedIn API v2 requires the author in URN format
    const authorUrn = `urn:li:person:${connection.account_id}`;

    console.log(`[LinkedIn] Publishing post for user ${user.id} | content=${content_id} author=${authorUrn}`);

    // LinkedIn Posts API (v2)
    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: {
              text: contentItem.content_text,
            },
            shareMediaCategory: "NONE",
          },
        },
        visibility: {
          "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
        },
      }),
    });

    const postData = await postResponse.json();

    if (!postResponse.ok) {
      const errorDetail = postData.message || postData.serviceErrorCode || JSON.stringify(postData);
      const failureReason = `LinkedIn API ${postResponse.status}: ${errorDetail}`;

      await supabase.from("content").update({
        status: "failed",
        failure_reason: failureReason,
      }).eq("id", content_id).eq("status", "approved");

      console.error(`[LinkedIn] Publish failed | content=${content_id}: ${failureReason}`);

      return new Response(JSON.stringify({ error: failureReason }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // postData.id is the URN of the post, e.g. "urn:li:ugcPost:1234567890"
    const postId = postData.id || "";
    const postIdNumeric = postId.replace("urn:li:ugcPost:", "").replace("urn:li:share:", "");
    const postUrl = `https://www.linkedin.com/feed/update/${postId}`;

    await supabase.from("content").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: postIdNumeric,
      external_url: postUrl,
    }).eq("id", content_id).eq("status", "approved").is("published_at", null);

    console.log(`[LinkedIn] Published | content=${content_id} post=${postId}`);

    return new Response(JSON.stringify({
      success: true,
      post_id: postId,
      post_url: postUrl,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[LinkedIn] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
