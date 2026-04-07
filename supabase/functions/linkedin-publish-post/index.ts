import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
      .select("id, access_token, expires_at, account_name, account_id")
      .eq("user_id", user.id)
      .eq("platform", "linkedin")
      .eq("connected", true)
      .eq("app_id", contentItem.app_id)
      .single();

    let connection = appConn;
    if (!connection) {
      const { data: userConn } = await supabase
        .from("platform_connections")
        .select("id, access_token, expires_at, account_name, account_id")
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

    // Check token expiry — LinkedIn tokens last 60 days, no refresh token available.
    // If expired, user must reconnect.
    if (connection.expires_at) {
      const expiresAt = new Date(connection.expires_at);
      if (expiresAt < new Date()) {
        // Mark connection as disconnected so UI shows "Needs Reconnect"
        await supabase.from("platform_connections").update({
          connected: false,
        }).eq("id", connection.id);

        return new Response(JSON.stringify({
          error: "LinkedIn token expired. Please reconnect your LinkedIn account in Settings.",
          action: "reconnect",
        }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const accessToken = connection.access_token;

    // Use the LinkedIn Posts API (Community Management API).
    // The author URN uses the member ID from /v2/me.
    const authorUrn = `urn:li:person:${connection.account_id}`;

    console.log(`[LinkedIn] Publishing post | user=${user.id} content=${content_id} author=${authorUrn}`);

    // LinkedIn Posts API (/rest/posts) — preferred over deprecated ugcPosts
    const postResponse = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202401",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: authorUrn,
        commentary: contentItem.content_text,
        visibility: "PUBLIC",
        distribution: {
          feedDistribution: "MAIN_FEED",
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: "PUBLISHED",
      }),
    });

    // LinkedIn Posts API returns 201 with the post URN in the x-restli-id header
    if (!postResponse.ok) {
      const postData = await postResponse.text();
      let errorDetail: string;
      try {
        const parsed = JSON.parse(postData);
        errorDetail = parsed.message || parsed.code || postData;
      } catch {
        errorDetail = postData;
      }
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

    // The post ID comes from the x-restli-id header or response body
    const restliId = postResponse.headers.get("x-restli-id") || "";
    // Consume response body
    await postResponse.text();

    const postUrn = restliId || "";
    const postUrl = postUrn
      ? `https://www.linkedin.com/feed/update/${postUrn}`
      : "";

    await supabase.from("content").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: postUrn,
      external_url: postUrl,
    }).eq("id", content_id).eq("status", "approved").is("published_at", null);

    console.log(`[LinkedIn] Published | content=${content_id} post=${postUrn}`);

    return new Response(JSON.stringify({
      success: true,
      post_id: postUrn,
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
