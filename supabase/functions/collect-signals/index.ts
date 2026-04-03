import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("[SignalCollector] Starting signal collection run");

    // Get all published content with external_post_id (real X posts)
    const { data: publishedContent, error: contentError } = await supabase
      .from("content")
      .select("id, external_post_id, platform, user_id")
      .eq("status", "published")
      .not("external_post_id", "is", null)
      .eq("platform", "x");

    if (contentError) throw contentError;

    if (!publishedContent || publishedContent.length === 0) {
      console.log("[SignalCollector] No published X posts to collect signals for");
      return new Response(JSON.stringify({ collected: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[SignalCollector] Found ${publishedContent.length} published X posts`);

    let collected = 0;
    let errors = 0;

    // Group by user to batch token lookups
    const byUser = new Map<string, typeof publishedContent>();
    for (const item of publishedContent) {
      const list = byUser.get(item.user_id) || [];
      list.push(item);
      byUser.set(item.user_id, list);
    }

    for (const [userId, items] of byUser) {
      // Get user's X connection
      const { data: connection } = await supabase
        .from("platform_connections")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", userId)
        .eq("platform", "x")
        .eq("connected", true)
        .maybeSingle();

      if (!connection?.access_token) {
        console.log(`[SignalCollector] No X connection for user ${userId}, skipping`);
        continue;
      }

      let accessToken = connection.access_token;

      // Refresh token if expired
      if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
        console.log(`[SignalCollector] Token expired for user ${userId}, refreshing`);
        try {
          const refreshed = await refreshXToken(connection.refresh_token!, supabase, userId);
          if (refreshed) {
            accessToken = refreshed;
          } else {
            console.error(`[SignalCollector] Token refresh failed for user ${userId}`);
            continue;
          }
        } catch (err) {
          console.error(`[SignalCollector] Token refresh error for user ${userId}:`, err);
          continue;
        }
      }

      // Fetch metrics for each post
      for (const item of items) {
        try {
          const tweetId = item.external_post_id;
          const response = await fetch(
            `https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );

          if (!response.ok) {
            console.error(`[SignalCollector] X API error for tweet ${tweetId}: ${response.status}`);
            errors++;
            continue;
          }

          const data = await response.json();
          const metrics = data.data?.public_metrics;

          if (metrics) {
            // Upsert performance signal
            const { error: upsertError } = await supabase
              .from("performance_signals")
              .insert({
                content_id: item.id,
                platform: "x",
                impressions: metrics.impression_count || 0,
                likes: metrics.like_count || 0,
                comments: metrics.reply_count || 0,
                reposts: metrics.retweet_count + (metrics.quote_count || 0),
                clicks: 0, // X API v2 doesn't expose clicks in basic tier
                conversions: 0,
              });

            if (upsertError) {
              console.error(`[SignalCollector] Insert error for ${item.id}:`, upsertError);
              errors++;
            } else {
              collected++;
              console.log(`[SignalCollector] Collected signals for tweet ${tweetId}: ${metrics.impression_count} impressions, ${metrics.like_count} likes`);

              // Also update the content table engagement counts
              await supabase
                .from("content")
                .update({
                  impressions: metrics.impression_count || 0,
                  engagements: (metrics.like_count || 0) + (metrics.reply_count || 0) + (metrics.retweet_count || 0),
                  clicks: 0,
                })
                .eq("id", item.id);
            }
          }
        } catch (err) {
          console.error(`[SignalCollector] Error collecting for ${item.id}:`, err);
          errors++;
        }
      }
    }

    console.log(`[SignalCollector] Done. Collected: ${collected}, Errors: ${errors}`);

    return new Response(
      JSON.stringify({ collected, errors, total: publishedContent.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[SignalCollector] Fatal error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function refreshXToken(
  refreshToken: string,
  supabase: any,
  userId: string
): Promise<string | null> {
  const clientId = Deno.env.get("X_CLIENT_ID")!;
  const clientSecret = Deno.env.get("X_CLIENT_SECRET")!;

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();

  await supabase
    .from("platform_connections")
    .update({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("platform", "x");

  return data.access_token;
}
