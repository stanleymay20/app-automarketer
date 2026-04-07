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
      .select("id, user_id, platform, content_text, status, published_at, app_id, image_url")
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

    const normalizedPlatform = contentItem.platform.toLowerCase().replace("x (twitter)", "x").replace("twitter", "x");
    if (normalizedPlatform !== "x" && normalizedPlatform !== "linkedin") {
      return new Response(JSON.stringify({ error: "Manual publish only supported for X and LinkedIn" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check live posting for X
    if (normalizedPlatform === "x" && Deno.env.get("LIVE_X_POSTING") !== "true") {
      return new Response(JSON.stringify({ error: "Live X posting is disabled (LIVE_X_POSTING != true)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch platform connection (app-specific then user-level)
    const { data: appConnection } = await supabase
      .from("platform_connections")
      .select("id, user_id, connected, access_token, refresh_token, expires_at, account_name, account_id")
      .eq("user_id", userId)
      .eq("platform", normalizedPlatform)
      .eq("connected", true)
      .eq("app_id", contentItem.app_id)
      .single();
    
    let connection = appConnection;
    if (!connection) {
      // Fallback: user-level connection (null app_id)
      const { data: userConnection } = await supabase
        .from("platform_connections")
        .select("id, user_id, connected, access_token, refresh_token, expires_at, account_name, account_id")
        .eq("user_id", userId)
        .eq("platform", normalizedPlatform)
        .eq("connected", true)
        .is("app_id", null)
        .single();
      connection = userConnection;
    }
    if (!connection) {
      // Fallback: any connected account for this platform
      const { data: anyConnection } = await supabase
        .from("platform_connections")
        .select("id, user_id, connected, access_token, refresh_token, expires_at, account_name, account_id")
        .eq("user_id", userId)
        .eq("platform", normalizedPlatform)
        .eq("connected", true)
        .limit(1)
        .single();
      connection = anyConnection;
    }

    if (!connection || !connection.access_token) {
      return new Response(JSON.stringify({ error: `${normalizedPlatform} account not connected or missing token` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if needed
    let accessToken = connection.access_token;
    if (connection.expires_at) {
      const expiresAt = new Date(connection.expires_at);
      if (expiresAt < new Date()) {
        // Token fully expired
        if (normalizedPlatform === "linkedin") {
          // LinkedIn has no refresh tokens — must reconnect
          await supabase.from("platform_connections").update({ connected: false }).eq("id", connection.id);
          return new Response(JSON.stringify({
            error: "LinkedIn token expired. Please reconnect your LinkedIn account in Settings.",
            action: "reconnect",
          }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      if (expiresAt < new Date(Date.now() + 5 * 60 * 1000) && connection.refresh_token) {
        if (normalizedPlatform === "x") {
          const refreshed = await refreshXToken(supabase, {
            id: connection.id, user_id: userId, refresh_token: connection.refresh_token,
          });
          if (refreshed) accessToken = refreshed.access_token;
          else return new Response(JSON.stringify({ error: "Token expired and refresh failed" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // LinkedIn: no refresh token path — handled by expiry check above
      }
    }

    let externalPostId: string | null = null;
    let externalUrl: string | null = null;

    if (normalizedPlatform === "x") {
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
        await supabase.from("content").update({ status: "failed", failure_reason: failureReason }).eq("id", content_id).eq("status", "approved");
        return new Response(JSON.stringify({ error: failureReason }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      externalPostId = tweetData.data?.id;
      const username = connection.account_name?.replace("@", "") || "i";
      externalUrl = `https://x.com/${username}/status/${externalPostId}`;
    } else if (normalizedPlatform === "linkedin") {
      // Validate account_id exists
      if (!connection.account_id) {
        return new Response(JSON.stringify({
          error: "LinkedIn account_id is missing. Please disconnect and reconnect LinkedIn.",
          action: "reconnect",
        }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const authorUrn = `urn:li:person:${connection.account_id}`;
      console.log(`[ManualPublish] Posting to LinkedIn | content=${content_id} author=${authorUrn}`);

      // Try to upload image if available
      let assetUrn: string | null = null;
      if (contentItem.image_url) {
        try {
          // 1. Register upload
          const registerRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              registerUploadRequest: {
                recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
                owner: authorUrn,
                serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }],
              },
            }),
          });
          if (registerRes.ok) {
            const registerData = await registerRes.json();
            const uploadUrl = registerData.value?.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
            const asset = registerData.value?.asset;
            if (uploadUrl && asset) {
              // 2. Download image
              const imgRes = await fetch(contentItem.image_url);
              if (imgRes.ok) {
                const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
                const imgType = imgRes.headers.get("content-type") || "image/png";
                // 3. Upload to LinkedIn
                const uploadRes = await fetch(uploadUrl, {
                  method: "PUT",
                  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": imgType },
                  body: imgBytes,
                });
                if (uploadRes.ok) {
                  assetUrn = asset;
                  console.log(`[ManualPublish] LinkedIn image uploaded: ${asset}`);
                }
              }
            }
          }
        } catch (imgErr) {
          console.error("[ManualPublish] LinkedIn image upload error (continuing text-only):", imgErr);
        }
      }

      // Build share content
      const shareContent: Record<string, unknown> = {
        shareCommentary: { text: contentItem.content_text },
      };
      if (assetUrn) {
        shareContent.shareMediaCategory = "IMAGE";
        shareContent.media = [{ status: "READY", media: assetUrn }];
      } else {
        shareContent.shareMediaCategory = "NONE";
      }

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
          specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
          visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
        }),
      });

      const postBody = await postResponse.text();
      console.log(`[ManualPublish] LinkedIn response: ${postResponse.status} ${postBody}`);

      if (!postResponse.ok) {
        let errorDetail: string;
        try { errorDetail = JSON.parse(postBody).message || postBody; } catch { errorDetail = postBody; }
        const failureReason = `LinkedIn ugcPosts ${postResponse.status}: ${errorDetail}`;
        await supabase.from("content").update({ status: "failed", failure_reason: failureReason }).eq("id", content_id).eq("status", "approved");
        return new Response(JSON.stringify({ error: failureReason }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let postId = "";
      try { postId = JSON.parse(postBody).id || ""; } catch { /* empty */ }
      postId = postId || postResponse.headers.get("x-restli-id") || "";
      externalPostId = postId;
      externalUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : "";
    }

    // Update content
    await supabase.from("content").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: externalPostId,
      external_url: externalUrl,
    }).eq("id", content_id).eq("status", "approved").is("published_at", null);

    console.log(`[ManualPublish] Success | content=${content_id} platform=${normalizedPlatform} url=${externalUrl}`);

    return new Response(JSON.stringify({ 
      success: true, 
      post_id: externalPostId, 
      post_url: externalUrl,
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
