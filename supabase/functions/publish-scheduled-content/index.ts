import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Generate mock analytics values
function generateMockAnalytics() {
  return {
    impressions: Math.floor(Math.random() * 5000) + 500,
    engagements: Math.floor(Math.random() * 300) + 20,
    clicks: Math.floor(Math.random() * 100) + 5,
  };
}

interface PublishResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

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

async function publishToX(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  contentId: string,
  contentText: string
): Promise<PublishResult> {
  console.log(`[Publisher] publishToX started | content=${contentId} user=${userId}`);

  // Check live posting flag
  const livePosting = Deno.env.get("LIVE_X_POSTING");
  if (livePosting !== "true") {
    console.log(`[Publisher] Live X posting disabled (LIVE_X_POSTING=${livePosting}) | content=${contentId}`);
    return { success: false, error: "live_posting_disabled" };
  }

  // Fetch user's X connection with tokens
  const { data: connection, error: connError } = await supabase
    .from("platform_connections")
    .select("id, user_id, connected, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("platform", "x")
    .eq("connected", true)
    .single();

  if (connError || !connection) {
    console.error(`[Publisher] No X connection for user ${userId} | content=${contentId}`);
    return { success: false, error: "X account not connected" };
  }

  if (!connection.access_token) {
    console.error(`[Publisher] No access token for user ${userId} | content=${contentId}`);
    return { success: false, error: "X access token missing" };
  }

  // Check daily posting cap (max 2/day)
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
    return { success: false, error: "daily_cap_reached" };
  }

  // Check if token needs refresh
  let accessToken = connection.access_token;
  if (connection.expires_at) {
    const expiresAt = new Date(connection.expires_at);
    const bufferTime = new Date(Date.now() + 5 * 60 * 1000); // 5 min buffer
    if (expiresAt < bufferTime && connection.refresh_token) {
      const refreshed = await refreshXToken(supabase, {
        id: connection.id,
        user_id: userId,
        refresh_token: connection.refresh_token,
      });
      if (refreshed) {
        accessToken = refreshed.access_token;
      } else {
        return { success: false, error: "Token expired and refresh failed" };
      }
    }
  }

  // Post to X API v2
  console.log(`[Publisher] Posting tweet for user ${userId} | content=${contentId}`);

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
    return { success: false, error: `X API ${tweetResponse.status}: ${errorDetail}` };
  }

  const tweetId = tweetData.data?.id;
  // Construct tweet URL using account_id or just use generic format
  const { data: connInfo } = await supabase
    .from("platform_connections")
    .select("account_name")
    .eq("user_id", userId)
    .eq("platform", "x")
    .single();

  const username = connInfo?.account_name?.replace("@", "") || "i";
  const tweetUrl = `https://x.com/${username}/status/${tweetId}`;

  console.log(`[Publisher] Tweet published successfully | content=${contentId} tweet=${tweetId} url=${tweetUrl}`);

  return { success: true, tweetId, tweetUrl };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[Publisher] Starting scheduled content publishing run...');

    // Query approved content that's ready to publish
    const now = new Date().toISOString();
    const { data: contentToPublish, error: fetchError } = await supabase
      .from('content')
      .select('id, user_id, platform, content_text, app_id, scheduled_for')
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

    console.log(`[Publisher] Found ${contentToPublish.length} items to publish`);

    const publishedIds: string[] = [];
    const skippedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const item of contentToPublish) {
      try {
        console.log(`[Publisher] Processing ${item.platform} content ${item.id} for user ${item.user_id}`);

        let externalPostId: string | null = null;
        let externalUrl: string | null = null;
        let failureReason: string | null = null;

        if (item.platform === "x") {
          // Real X posting
          const result = await publishToX(supabase, item.user_id, item.id, item.content_text);

          if (result.success) {
            externalPostId = result.tweetId || null;
            externalUrl = result.tweetUrl || null;
          } else if (result.error === "daily_cap_reached") {
            // Skip, don't mark as failed - leave as approved for next run
            console.log(`[Publisher] Skipping content ${item.id} - daily cap reached`);
            skippedIds.push(item.id);
            continue;
          } else if (result.error === "live_posting_disabled") {
            // Simulate publishing when live posting is off
            console.log(`[Publisher] Simulating publish for content ${item.id} (live posting disabled)`);
          } else {
            // Real failure
            failureReason = result.error || "Unknown X posting error";
            const { error: failError } = await supabase
              .from('content')
              .update({
                status: 'failed',
                failure_reason: failureReason,
              })
              .eq('id', item.id)
              .eq('status', 'approved');

            if (!failError) {
              console.log(`[Publisher] Marked content ${item.id} as failed: ${failureReason}`);
              errors.push({ id: item.id, error: failureReason });
            }
            continue;
          }
        } else {
          // Mock for other platforms
          console.log(`[Publisher] Mock publishing to ${item.platform}: "${item.content_text.substring(0, 50)}..."`);
        }

        // Only use mock analytics for non-X platforms; real X metrics come from collect-signals
        const isRealXPost = item.platform === "x" && externalPostId;
        const mockAnalytics = isRealXPost ? null : generateMockAnalytics();

        // Mark as published
        const { error: updateError } = await supabase
          .from('content')
          .update({ 
            status: 'published', 
            published_at: new Date().toISOString(),
            impressions: mockAnalytics?.impressions ?? 0,
            engagements: mockAnalytics?.engagements ?? 0,
            clicks: mockAnalytics?.clicks ?? 0,
            external_post_id: externalPostId,
            external_url: externalUrl,
          })
          .eq('id', item.id)
          .eq('status', 'approved') // Idempotency
          .is('published_at', null); // Idempotency

        if (updateError) {
          console.error(`[Publisher] Error updating content ${item.id}:`, updateError);
          errors.push({ id: item.id, error: updateError.message });
        } else {
          publishedIds.push(item.id);
          console.log(`[Publisher] Successfully published content ${item.id} to ${item.platform}${externalUrl ? ` → ${externalUrl}` : ''}`);
        }
      } catch (itemError) {
        console.error(`[Publisher] Error processing content ${item.id}:`, itemError);
        errors.push({ id: item.id, error: String(itemError) });
        
        // Mark as failed
        await supabase.from('content').update({
          status: 'failed',
          failure_reason: String(itemError),
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
