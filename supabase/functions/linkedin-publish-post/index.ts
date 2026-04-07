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
    console.log(`[LinkedInPublish] Looking up connection for user=${user.id} app=${contentItem.app_id}`);

    const { data: appConn } = await supabase
      .from("platform_connections")
      .select("id, access_token, expires_at, account_name, account_id, connected")
      .eq("user_id", user.id)
      .eq("platform", "linkedin")
      .eq("connected", true)
      .eq("app_id", contentItem.app_id)
      .single();

    let connection = appConn;
    if (!connection) {
      const { data: userConn } = await supabase
        .from("platform_connections")
        .select("id, access_token, expires_at, account_name, account_id, connected")
        .eq("user_id", user.id)
        .eq("platform", "linkedin")
        .eq("connected", true)
        .is("app_id", null)
        .single();
      connection = userConn;
    }

    console.log(`[LinkedInPublish] Connection found: ${!!connection} | id=${connection?.id} | account_id=${connection?.account_id} | account_name=${connection?.account_name} | has_token=${!!connection?.access_token}`);

    if (!connection || !connection.access_token) {
      return new Response(JSON.stringify({ error: "LinkedIn not connected or missing token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check account_id — required to construct author URN
    if (!connection.account_id) {
      console.error(`[LinkedInPublish] BLOCKED: account_id is empty. Cannot construct author URN.`);
      return new Response(JSON.stringify({
        error: "LinkedIn account_id is missing. Please disconnect and reconnect LinkedIn in Settings. If this persists, the 'Sign In with LinkedIn using OpenID Connect' product may be required.",
        action: "reconnect",
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check token expiry — no refresh token available
    if (connection.expires_at) {
      const expiresAt = new Date(connection.expires_at);
      if (expiresAt < new Date()) {
        await supabase.from("platform_connections").update({ connected: false }).eq("id", connection.id);
        return new Response(JSON.stringify({
          error: "LinkedIn token expired. Please reconnect your LinkedIn account in Settings.",
          action: "reconnect",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const accessToken = connection.access_token;
    const authorUrn = `urn:li:person:${connection.account_id}`;

    console.log(`[LinkedInPublish] Publishing | content=${content_id} | author=${authorUrn}`);

    // ── Primary: POST /v2/ugcPosts (documented for Share on LinkedIn self-serve) ──
    const ugcBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: { text: contentItem.content_text },
          shareMediaCategory: "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    console.log(`[LinkedInPublish] POST /v2/ugcPosts ...`);

    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(ugcBody),
    });

    const postBody = await postResponse.text();
    console.log(`[LinkedInPublish] /v2/ugcPosts response status: ${postResponse.status}`);
    console.log(`[LinkedInPublish] /v2/ugcPosts response body: ${postBody}`);
    console.log(`[LinkedInPublish] /v2/ugcPosts x-restli-id: ${postResponse.headers.get("x-restli-id")}`);

    if (!postResponse.ok) {
      let errorDetail: string;
      try {
        const parsed = JSON.parse(postBody);
        errorDetail = parsed.message || parsed.serviceErrorCode || postBody;
      } catch {
        errorDetail = postBody;
      }
      const failureReason = `LinkedIn ugcPosts API ${postResponse.status}: ${errorDetail}`;

      await supabase.from("content").update({
        status: "failed",
        failure_reason: failureReason,
      }).eq("id", content_id).eq("status", "approved");

      console.error(`[LinkedInPublish] FAILED | content=${content_id}: ${failureReason}`);

      return new Response(JSON.stringify({ error: failureReason }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success — extract post ID
    let postId = "";
    try {
      const parsed = JSON.parse(postBody);
      postId = parsed.id || postResponse.headers.get("x-restli-id") || "";
    } catch {
      postId = postResponse.headers.get("x-restli-id") || "";
    }

    const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : "";

    await supabase.from("content").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: postId,
      external_url: postUrl,
    }).eq("id", content_id).eq("status", "approved").is("published_at", null);

    console.log(`[LinkedInPublish] SUCCESS | content=${content_id} | post_id=${postId} | url=${postUrl}`);

    return new Response(JSON.stringify({
      success: true,
      post_id: postId,
      post_url: postUrl,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[LinkedInPublish] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
