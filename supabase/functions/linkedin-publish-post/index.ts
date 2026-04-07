import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/** Upload an image to LinkedIn and return the asset URN */
async function uploadImageToLinkedIn(
  accessToken: string,
  authorUrn: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // 1. Register upload
    const registerBody = {
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [
          {
            relationshipType: "OWNER",
            identifier: "urn:li:userGeneratedContent",
          },
        ],
      },
    };

    console.log("[LinkedInPublish] Registering image upload...");
    const registerRes = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerBody),
      }
    );

    if (!registerRes.ok) {
      const errText = await registerRes.text();
      console.error("[LinkedInPublish] Register upload failed:", registerRes.status, errText);
      return null;
    }

    const registerData = await registerRes.json();
    const uploadUrl =
      registerData.value?.uploadMechanism?.[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ]?.uploadUrl;
    const asset = registerData.value?.asset;

    if (!uploadUrl || !asset) {
      console.error("[LinkedInPublish] Missing uploadUrl or asset in register response");
      return null;
    }

    console.log(`[LinkedInPublish] Got upload URL and asset: ${asset}`);

    // 2. Download image binary
    console.log(`[LinkedInPublish] Downloading image from: ${imageUrl}`);
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      console.error("[LinkedInPublish] Failed to download image:", imageRes.status);
      return null;
    }
    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());
    const contentType = imageRes.headers.get("content-type") || "image/png";

    // 3. Upload binary to LinkedIn
    console.log(`[LinkedInPublish] Uploading ${imageBytes.length} bytes to LinkedIn...`);
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": contentType,
      },
      body: imageBytes,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[LinkedInPublish] Image upload failed:", uploadRes.status, errText);
      return null;
    }

    console.log(`[LinkedInPublish] Image uploaded successfully. Asset: ${asset}`);
    return asset; // e.g. "urn:li:digitalmediaAsset:XXXXX"
  } catch (err) {
    console.error("[LinkedInPublish] Image upload error:", err);
    return null;
  }
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

    // Fetch content — include image_url
    const { data: contentItem, error: contentError } = await supabase
      .from("content")
      .select("id, user_id, platform, content_text, status, published_at, app_id, image_url")
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

    // Get LinkedIn connection (app-specific → null app_id → any)
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
    if (!connection) {
      const { data: anyConn } = await supabase
        .from("platform_connections")
        .select("id, access_token, expires_at, account_name, account_id, connected")
        .eq("user_id", user.id)
        .eq("platform", "linkedin")
        .eq("connected", true)
        .limit(1)
        .single();
      connection = anyConn;
    }

    console.log(`[LinkedInPublish] Connection found: ${!!connection} | account_id=${connection?.account_id}`);

    if (!connection || !connection.access_token) {
      return new Response(JSON.stringify({ error: "LinkedIn not connected or missing token" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!connection.account_id) {
      return new Response(JSON.stringify({
        error: "LinkedIn account_id is missing. Please disconnect and reconnect LinkedIn in Settings.",
        action: "reconnect",
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check token expiry
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

    // Try to upload image if available
    let assetUrn: string | null = null;
    if (contentItem.image_url) {
      assetUrn = await uploadImageToLinkedIn(accessToken, authorUrn, contentItem.image_url);
      console.log(`[LinkedInPublish] Image asset URN: ${assetUrn || "NONE (fallback to text-only)"}`);
    }

    // Build ugcPosts payload
    const shareContent: Record<string, unknown> = {
      shareCommentary: { text: contentItem.content_text },
    };

    if (assetUrn) {
      shareContent.shareMediaCategory = "IMAGE";
      shareContent.media = [
        {
          status: "READY",
          media: assetUrn,
        },
      ];
    } else {
      shareContent.shareMediaCategory = "NONE";
    }

    const ugcBody = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": shareContent,
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    console.log(`[LinkedInPublish] POST /v2/ugcPosts | hasImage=${!!assetUrn}`);

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
    console.log(`[LinkedInPublish] Response: ${postResponse.status} ${postBody}`);

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
        status: "failed", failure_reason: failureReason,
      }).eq("id", content_id).eq("status", "approved");

      return new Response(JSON.stringify({ error: failureReason }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let postId = "";
    try { postId = JSON.parse(postBody).id || ""; } catch { /* empty */ }
    postId = postId || postResponse.headers.get("x-restli-id") || "";
    const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : "";

    await supabase.from("content").update({
      status: "published",
      published_at: new Date().toISOString(),
      external_post_id: postId,
      external_url: postUrl,
    }).eq("id", content_id).eq("status", "approved").is("published_at", null);

    console.log(`[LinkedInPublish] SUCCESS | post_id=${postId} | url=${postUrl}`);

    return new Response(JSON.stringify({
      success: true, post_id: postId, post_url: postUrl,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[LinkedInPublish] Unhandled error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
