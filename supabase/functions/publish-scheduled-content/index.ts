import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PublishResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  postId?: string;
  postUrl?: string;
  error?: string;
  permanent?: boolean; // true = don't retry, mark as failed
}

function categorizeFailure(reason: string | null | undefined): string {
  if (!reason) return "unknown";
  const r = reason.toLowerCase();
  if (r.includes("token expired") || r.includes("reconnect") || r.includes("not connected")) return "token_expired";
  if (r.includes("credits") || r.includes("402")) return "account_no_credits";
  if (r.includes("character limit") || r.includes("too long") || r.includes("exceeds")) return "content_too_long";
  if (r.includes("429") || r.includes("rate limit")) return "rate_limit";
  if (/\b5\d{2}\b/.test(r)) return "platform_5xx";
  if (r.includes("validation") || r.includes("too short") || r.includes("unattached") || r.includes("overdue")) return "validation";
  return "platform_error";
}


// ─── X Token Refresh ────────────────────────────────────────────────
async function refreshXToken(
  supabase: ReturnType<typeof createClient>,
  connection: { id: string; user_id: string; refresh_token: string }
): Promise<{ access_token: string } | null> {
  const clientId = Deno.env.get("X_CLIENT_ID");
  const clientSecret = Deno.env.get("X_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    console.error("[Publisher] X_CLIENT_ID or X_CLIENT_SECRET not configured");
    return null;
  }

  console.log(`[Publisher] Refreshing X token for user ${connection.user_id}`);

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

  if (!response.ok) {
    console.error(`[Publisher] Token refresh failed for user ${connection.user_id}:`, data);
    return null;
  }

  const expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();

  await supabase.from("platform_connections").update({
    access_token: data.access_token,
    refresh_token: data.refresh_token || connection.refresh_token,
    expires_at: expiresAt,
    token_type: data.token_type || "bearer",
  }).eq("id", connection.id);

  console.log(`[Publisher] Token refreshed for user ${connection.user_id}`);
  return { access_token: data.access_token };
}

// ─── X Connection Resolver ──────────────────────────────────────────
async function getXConnection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  appId: string
) {
  const { data: appConn } = await supabase
    .from("platform_connections")
    .select("id, user_id, connected, access_token, refresh_token, expires_at, account_name")
    .eq("user_id", userId)
    .eq("platform", "x")
    .eq("connected", true)
    .eq("app_id", appId)
    .single();

  if (appConn) return appConn;

  const { data: userConn } = await supabase
    .from("platform_connections")
    .select("id, user_id, connected, access_token, refresh_token, expires_at, account_name")
    .eq("user_id", userId)
    .eq("platform", "x")
    .eq("connected", true)
    .is("app_id", null)
    .single();

  if (userConn) return userConn;

  // Final fallback: any connected X account
  const { data: anyConn } = await supabase
    .from("platform_connections")
    .select("id, user_id, connected, access_token, refresh_token, expires_at, account_name")
    .eq("user_id", userId)
    .eq("platform", "x")
    .eq("connected", true)
    .limit(1)
    .single();

  return anyConn;
}

// ─── LinkedIn Connection Resolver ───────────────────────────────────
async function getLinkedInConnection(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  appId: string
) {
  const { data: appConn } = await supabase
    .from("platform_connections")
    .select("id, access_token, expires_at, account_name, account_id")
    .eq("user_id", userId)
    .eq("platform", "linkedin")
    .eq("connected", true)
    .eq("app_id", appId)
    .single();

  if (appConn) return appConn;

  const { data: userConn } = await supabase
    .from("platform_connections")
    .select("id, access_token, expires_at, account_name, account_id")
    .eq("user_id", userId)
    .eq("platform", "linkedin")
    .eq("connected", true)
    .is("app_id", null)
    .single();

  if (userConn) return userConn;

  const { data: anyConn } = await supabase
    .from("platform_connections")
    .select("id, access_token, expires_at, account_name, account_id")
    .eq("user_id", userId)
    .eq("platform", "linkedin")
    .eq("connected", true)
    .limit(1)
    .single();

  return anyConn;
}

// ─── LinkedIn Image Upload ──────────────────────────────────────────
async function uploadImageToLinkedIn(
  accessToken: string,
  authorUrn: string,
  imageUrl: string
): Promise<string | null> {
  try {
    const registerRes = await fetch(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: authorUrn,
            serviceRelationships: [
              { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
            ],
          },
        }),
      }
    );

    if (!registerRes.ok) {
      const errText = await registerRes.text();
      console.error("[Publisher] LinkedIn register upload failed:", registerRes.status, errText);
      return null;
    }

    const registerData = await registerRes.json();
    const uploadUrl =
      registerData.value?.uploadMechanism?.[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ]?.uploadUrl;
    const asset = registerData.value?.asset;

    if (!uploadUrl || !asset) {
      console.error("[Publisher] Missing uploadUrl or asset in LinkedIn register response");
      return null;
    }

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      console.error("[Publisher] Failed to download image:", imageRes.status);
      return null;
    }
    const imageBytes = new Uint8Array(await imageRes.arrayBuffer());
    const contentType = imageRes.headers.get("content-type") || "image/png";

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
      console.error("[Publisher] LinkedIn image upload failed:", uploadRes.status, errText);
      return null;
    }

    console.log(`[Publisher] LinkedIn image uploaded: ${asset}`);
    return asset;
  } catch (err) {
    console.error("[Publisher] LinkedIn image upload error:", err);
    return null;
  }
}

// ─── Publish to X ───────────────────────────────────────────────────
async function publishToX(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contentId: string,
  contentText: string,
  appId: string
): Promise<PublishResult> {
  console.log(`[Publisher] publishToX started | content=${contentId} user=${userId} app=${appId}`);

  const livePosting = Deno.env.get("LIVE_X_POSTING");
  if (livePosting !== "true") {
    console.log(`[Publisher] Live X posting disabled | content=${contentId}`);
    return { success: false, error: "Live X posting is currently disabled", permanent: false };
  }

  const connection = await getXConnection(supabase, userId, appId);

  if (!connection) {
    return { success: false, error: "X account not connected", permanent: true };
  }

  if (!connection.access_token) {
    return { success: false, error: "X access token missing", permanent: true };
  }

  // Daily cap check (max 2/day)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count: todayCount } = await supabase
    .from("content")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("platform", "x")
    .eq("status", "published")
    .not("external_post_id", "is", null)
    .gte("published_at", todayStart.toISOString());

  if ((todayCount || 0) >= 2) {
    console.warn(`[Publisher] Daily X cap reached for user ${userId} (${todayCount}/2) | content=${contentId}`);
    return { success: false, error: "Daily posting limit reached (2/day). Will retry tomorrow.", permanent: false };
  }

  // Token refresh if needed
  let accessToken = connection.access_token;
  if (connection.expires_at) {
    const expiresAt = new Date(connection.expires_at);
    const bufferTime = new Date(Date.now() + 5 * 60 * 1000);
    if (expiresAt < bufferTime && connection.refresh_token) {
      const refreshed = await refreshXToken(supabase, {
        id: connection.id,
        user_id: userId,
        refresh_token: connection.refresh_token,
      });
      if (refreshed) {
        accessToken = refreshed.access_token;
      } else {
        // Fix 1: refresh failed → mark disconnected so further queued posts
        // short-circuit on the pre-flight check instead of burning more calls.
        await supabase.from("platform_connections").update({ connected: false }).eq("id", connection.id);
        return { success: false, error: "X token expired and refresh failed. Please reconnect X.", permanent: true };
      }
    } else if (expiresAt < new Date() && !connection.refresh_token) {
      await supabase.from("platform_connections").update({ connected: false }).eq("id", connection.id);
      return { success: false, error: "X token expired. Please reconnect.", permanent: true };
    }
  }

  console.log(`[Publisher] Posting tweet | content=${contentId}`);

  const tweetResponse = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: contentText }),
  });

  const tweetData = await tweetResponse.json();

  if (!tweetResponse.ok) {
    console.error(`[Publisher] X API error [${tweetResponse.status}] | content=${contentId}:`, tweetData);
    const errorDetail = tweetData.detail || tweetData.title || JSON.stringify(tweetData);
    // 402 = credits depleted, 403 = permissions, 401 = auth — all permanent
    const isPermanent = [401, 402, 403].includes(tweetResponse.status);
    // Fix 1: on auth/credit failures, disconnect so the next batch's pre-flight
    // skips queued X posts (no_connection) instead of burning more credits.
    if (isPermanent) {
      await supabase.from("platform_connections").update({ connected: false }).eq("id", connection.id);
    }
    return { success: false, error: `X API ${tweetResponse.status}: ${errorDetail}`, permanent: isPermanent };
  }

  const tweetId = tweetData.data?.id;
  const username = connection.account_name?.replace("@", "") || "i";
  const tweetUrl = `https://x.com/${username}/status/${tweetId}`;

  console.log(`[Publisher] Tweet published | content=${contentId} url=${tweetUrl}`);

  return { success: true, tweetId, tweetUrl };
}

// ─── Publish to LinkedIn ────────────────────────────────────────────
async function publishToLinkedIn(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contentId: string,
  contentText: string,
  appId: string,
  imageUrl: string | null
): Promise<PublishResult> {
  console.log(`[Publisher] publishToLinkedIn started | content=${contentId} user=${userId} app=${appId}`);

  const connection = await getLinkedInConnection(supabase, userId, appId);

  if (!connection || !connection.access_token) {
    return { success: false, error: "LinkedIn account not connected", permanent: true };
  }

  if (!connection.account_id) {
    return { success: false, error: "LinkedIn account_id missing. Please reconnect.", permanent: true };
  }

  // Check token expiry
  if (connection.expires_at && new Date(connection.expires_at) < new Date()) {
    await supabase.from("platform_connections").update({ connected: false }).eq("id", connection.id);
    return { success: false, error: "LinkedIn token expired. Please reconnect.", permanent: true };
  }

  const accessToken = connection.access_token;
  const authorUrn = `urn:li:person:${connection.account_id}`;

  // Upload image if available
  let assetUrn: string | null = null;
  if (imageUrl) {
    assetUrn = await uploadImageToLinkedIn(accessToken, authorUrn, imageUrl);
    console.log(`[Publisher] LinkedIn image asset: ${assetUrn || "FAILED"} | content=${contentId}`);

    // Block publish if image upload failed (mandatory media rule)
    if (!assetUrn) {
      return { success: false, error: "LinkedIn image upload failed. Cannot publish without media.", permanent: true };
    }
  }

  // Build share content
  const shareContent: Record<string, unknown> = {
    shareCommentary: { text: contentText },
  };

  if (assetUrn) {
    shareContent.shareMediaCategory = "IMAGE";
    shareContent.media = [{ status: "READY", media: assetUrn }];
  } else {
    shareContent.shareMediaCategory = "NONE";
  }

  console.log(`[Publisher] POST /v2/ugcPosts | hasImage=${!!assetUrn} | content=${contentId}`);

  const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
      "LinkedIn-Version": "202401",
    },
    body: JSON.stringify({
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": shareContent,
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    }),
  });

  const postBody = await postResponse.text();
  console.log(`[Publisher] LinkedIn response: ${postResponse.status} ${postBody.substring(0, 300)}`);

  if (!postResponse.ok) {
    let errorDetail: string;
    try { errorDetail = JSON.parse(postBody).message || postBody; } catch { errorDetail = postBody; }
    const isPermanent = [401, 403].includes(postResponse.status);
    return { success: false, error: `LinkedIn API ${postResponse.status}: ${errorDetail}`, permanent: isPermanent };
  }

  let postId = "";
  try { postId = JSON.parse(postBody).id || ""; } catch { /* empty */ }
  postId = postId || postResponse.headers.get("x-restli-id") || "";
  const postUrl = postId ? `https://www.linkedin.com/feed/update/${postId}` : "";

  console.log(`[Publisher] LinkedIn published | content=${contentId} url=${postUrl}`);

  return { success: true, postId, postUrl };
}

// ─── Content Validation ─────────────────────────────────────────────
const PLACEHOLDER_PATTERNS = [
  /^lorem ipsum/i,
  /^placeholder/i,
  /^test post/i,
  /^sample content/i,
  /^\[.*\]$/,
  /^TODO/i,
  /^draft$/i,
];

const MIN_CONTENT_LENGTH = 20;

function validateContentForPublish(contentText: string, platform: string): string | null {
  if (!contentText || contentText.trim().length === 0) {
    return "Content is empty. Cannot publish blank content.";
  }
  if (contentText.trim().length < MIN_CONTENT_LENGTH) {
    return `Content too short (${contentText.trim().length} chars). Minimum ${MIN_CONTENT_LENGTH} required.`;
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(contentText.trim())) {
      return "Content appears to be placeholder text.";
    }
  }
  if (platform === "x" && contentText.length > 280) {
    return `Content exceeds X's 280 character limit (${contentText.length} chars).`;
  }
  return null;
}

// ─── Max Staleness: fail posts stuck too long ───────────────────────
const MAX_OVERDUE_HOURS = 48;

function isStalePost(scheduledFor: string | null): boolean {
  if (!scheduledFor) return false;
  const scheduled = new Date(scheduledFor);
  const cutoff = new Date(Date.now() - MAX_OVERDUE_HOURS * 60 * 60 * 1000);
  return scheduled < cutoff;
}

// ─── Main Handler ───────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Publisher] Starting scheduled content publishing run...');

    const now = new Date().toISOString();
    const { data: contentToPublish, error: fetchError } = await supabase
      .from('content')
      .select('id, user_id, platform, content_text, app_id, scheduled_for, image_url')
      .eq('status', 'approved')
      .lte('scheduled_for', now)
      .is('published_at', null);

    if (fetchError) {
      console.error('[Publisher] Error fetching content:', fetchError);
      throw fetchError;
    }

    if (!contentToPublish || contentToPublish.length === 0) {
      console.log('[Publisher] No content ready to publish');
      return new Response(
        JSON.stringify({ message: 'No content to publish', published: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize platforms
    const normalizedContent = contentToPublish.map(item => ({
      ...item,
      platform: item.platform.toLowerCase().replace("x (twitter)", "x").replace("twitter", "x"),
    }));

    console.log(`[Publisher] Found ${normalizedContent.length} items to publish`);

    const publishedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const item of normalizedContent) {
      const itemStartedAt = Date.now();
      try {
        // Fail stale posts that have been stuck for too long
        if (isStalePost(item.scheduled_for)) {
          const failureReason = `Post overdue by more than ${MAX_OVERDUE_HOURS} hours. Marked as failed.`;
          await supabase.from('content').update({
            status: 'failed', failure_reason: failureReason, failure_category: 'validation',
          }).eq('id', item.id).eq('status', 'approved');
          console.log(`[Publisher] Stale post failed: ${item.id}`);
          errors.push({ id: item.id, error: failureReason });
          continue;
        }

        console.log(`[Publisher] Processing ${item.platform} content ${item.id} for user ${item.user_id}`);

        // Pre-flight: connection must exist before we attempt
        const { data: conn } = await supabase
          .from('platform_connections')
          .select('id, connected, expires_at')
          .eq('user_id', item.user_id)
          .eq('platform', item.platform)
          .eq('connected', true)
          .maybeSingle();
        if (!conn) {
          const reason = `No active ${item.platform} connection. Connect the account first.`;
          await supabase.from('content').update({
            status: 'failed', failure_reason: reason, failure_category: 'no_connection',
          }).eq('id', item.id).eq('status', 'approved');
          errors.push({ id: item.id, error: reason });
          continue;
        }

        // Pre-publish content validation
        const contentValidationError = validateContentForPublish(item.content_text, item.platform);
        if (contentValidationError) {
          console.error(`[Publisher] Content validation failed for ${item.id}: ${contentValidationError}`);
          await supabase.from('content').update({
            status: 'failed', failure_reason: contentValidationError, failure_category: 'validation',
          }).eq('id', item.id).eq('status', 'approved');
          errors.push({ id: item.id, error: contentValidationError });
          continue;
        }

        console.log(`[Publisher] Content validated | content=${item.id} | first120="${item.content_text.substring(0, 120)}"`);

        let result: PublishResult;

        if (item.platform === "x") {
          result = await publishToX(supabase, item.user_id, item.id, item.content_text, item.app_id);
        } else if (item.platform === "linkedin") {
          result = await publishToLinkedIn(supabase, item.user_id, item.id, item.content_text, item.app_id, item.image_url);
        } else {
          console.log(`[Publisher] Skipping ${item.id} — no API for ${item.platform}`);
          skippedIds.push(item.id);
          continue;
        }

        const latencyMs = Date.now() - itemStartedAt;

        if (result.success) {
          const externalPostId = result.tweetId || result.postId || null;
          const externalUrl = result.tweetUrl || result.postUrl || null;

          const { error: updateError } = await supabase
            .from('content')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              publish_latency_ms: latencyMs,
              impressions: 0,
              engagements: 0,
              clicks: 0,
              external_post_id: externalPostId,
              external_url: externalUrl,
            })
            .eq('id', item.id)
            .eq('status', 'approved')
            .is('published_at', null);

          if (updateError) {
            console.error(`[Publisher] Update error for ${item.id}:`, updateError);
            errors.push({ id: item.id, error: updateError.message });
          } else {
            publishedIds.push(item.id);
            console.log(`[Publisher] Published ${item.id} → ${externalUrl || 'no URL'} (${latencyMs}ms)`);

            // Fire-and-forget: regenerate learning insights for this app (Marketing Intelligence Loop)
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-learning-insights`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ app_id: item.app_id, user_id: item.user_id }),
            }).catch((e) => console.error("[Publisher] Insight refresh failed:", e));
          }
        } else if (result.permanent) {
          // Permanent failure — mark as failed, don't retry
          const reason = result.error || "Permanent publishing error";
          await supabase.from('content').update({
            status: 'failed',
            failure_reason: reason,
            failure_category: categorizeFailure(reason),
          }).eq('id', item.id).eq('status', 'approved');
          console.log(`[Publisher] Permanent failure for ${item.id}: ${reason}`);
          errors.push({ id: item.id, error: reason });
        } else {
          // Transient failure — bump retry_count, skip; cron loop retries on next tick
          await supabase.from('content').update({
            retry_count: ((item as any).retry_count ?? 0) + 1,
          }).eq('id', item.id).eq('status', 'approved');
          console.log(`[Publisher] Transient skip for ${item.id}: ${result.error}`);
          skippedIds.push(item.id);
        }

      } catch (itemError) {
        console.error(`[Publisher] Error processing ${item.id}:`, itemError);
        const reason = String(itemError);
        errors.push({ id: item.id, error: reason });

        await supabase.from('content').update({
          status: 'failed',
          failure_reason: reason,
          failure_category: categorizeFailure(reason),
        }).eq('id', item.id).eq('status', 'approved');
      }
    }


    const result = {
      message: `Published ${publishedIds.length} items`,
      published: publishedIds.length,
      skipped: skippedIds.length,
      publishedIds,
      skippedIds: skippedIds.length > 0 ? skippedIds : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('[Publisher] Run complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Publisher] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
