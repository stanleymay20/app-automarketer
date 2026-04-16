import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Pattern detection helpers ──────────────────────────────────────

const CTA_REGEX = /\b(comment|reply|click|learn more|read more|sign up|try|download|get|join|share|follow|subscribe|book|grab|tag|save this|dm|link in bio|what.s your take|where does .* break|let me know)\b/i;
const QUESTION_REGEX = /\?/;
const EMOJI_REGEX = /[\p{Extended_Pictographic}]/u;

function firstSentence(text: string): string {
  const t = text.trim().split(/\n/)[0] || "";
  const m = t.match(/^.{1,200}?[.!?](?:\s|$)/);
  return (m ? m[0] : t).trim();
}

function detectPatterns(text: string) {
  const len = text.length;
  const lengthBucket =
    len < 150 ? "short" : len < 400 ? "medium" : "long";

  const hook = firstSentence(text);
  const startsWithQuestion = /^[^.!?\n]{0,200}\?/.test(text.trim());
  const startsWithBoldClaim = /^(most|stop|nobody|everyone|forget|here.s why|the truth)/i.test(hook);
  const hookStrength: "strong" | "weak" =
    startsWithQuestion || startsWithBoldClaim || hook.length < 80 ? "strong" : "weak";

  const hasCta = CTA_REGEX.test(text);
  const hasQuestion = QUESTION_REGEX.test(text);
  const lineBreaks = (text.match(/\n/g) || []).length;
  const wellFormatted = lineBreaks >= 2;
  const emojiCount = (text.match(EMOJI_REGEX) || []).length;

  return { lengthBucket, hookStrength, hasCta, hasQuestion, wellFormatted, emojiCount, hookText: hook };
}

type PostRow = {
  id: string;
  platform: string;
  content_text: string;
  impressions: number | null;
  engagements: number | null;
  clicks: number | null;
};

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function correlatePattern(
  posts: PostRow[],
  predicate: (p: PostRow) => boolean,
  metric: (p: PostRow) => number
) {
  const withIt = posts.filter(predicate);
  const without = posts.filter((p) => !predicate(p));
  if (withIt.length < 2 || without.length < 2) return null;
  const avgWith = avg(withIt.map(metric));
  const avgWithout = avg(without.map(metric));
  if (avgWithout === 0 && avgWith === 0) return null;
  const lift = avgWithout > 0 ? (avgWith - avgWithout) / avgWithout : avgWith > 0 ? 1 : 0;
  return { avgWith, avgWithout, lift, sampleWith: withIt.length, sampleWithout: without.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { app_id: requestedAppId, user_id: requestedUserId, all } = body;

    // Batch mode: process every app that has published content
    let targets: { app_id: string; user_id: string }[] = [];
    if (all) {
      const { data: appsWithPosts } = await supabase
        .from("content")
        .select("app_id, user_id")
        .eq("status", "published");
      const seen = new Set<string>();
      for (const r of appsWithPosts || []) {
        const key = `${r.app_id}:${r.user_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          targets.push({ app_id: r.app_id, user_id: r.user_id });
        }
      }
    } else {
      if (!requestedAppId || !requestedUserId) {
        return new Response(JSON.stringify({ error: "app_id and user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      targets = [{ app_id: requestedAppId, user_id: requestedUserId }];
    }

    const results: any[] = [];

    for (const { app_id, user_id } of targets) {
      console.log(`[LearningInsights] Processing app ${app_id}`);

      const [{ data: app }, { data: goal }, { data: publishedContent }] = await Promise.all([
        supabase.from("apps").select("name, platforms, brand_tone, target_audience").eq("id", app_id).single(),
        supabase.from("growth_goals").select("*").eq("app_id", app_id).eq("status", "active").limit(1).maybeSingle(),
        supabase
          .from("content")
          .select("id, platform, content_text, impressions, engagements, clicks")
          .eq("app_id", app_id)
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50),
      ]);

      const posts: PostRow[] = (publishedContent || []) as PostRow[];

      const insights: Array<{ insight_type: string; insight_text: string; platform: string | null; confidence: number }> = [];

      // ── Pattern correlation (only if enough data) ────────────────
      if (posts.length >= 4) {
        const enriched = posts.map((p) => ({ ...p, ...detectPatterns(p.content_text) }));

        const engMetric = (p: PostRow) => (p.engagements || 0);
        const clickMetric = (p: PostRow) => (p.clicks || 0);

        // Strong hook
        const hookCorr = correlatePattern(
          enriched,
          (p: any) => p.hookStrength === "strong",
          engMetric
        );
        if (hookCorr && Math.abs(hookCorr.lift) > 0.25) {
          if (hookCorr.lift > 0) {
            insights.push({
              insight_type: "winning_angle",
              insight_text: `🔥 Posts with a strong hook get ${Math.round(hookCorr.lift * 100)}% more engagement (${hookCorr.avgWith.toFixed(1)} vs ${hookCorr.avgWithout.toFixed(1)} avg).`,
              platform: null,
              confidence: Math.min(0.9, 0.5 + Math.min(hookCorr.sampleWith, hookCorr.sampleWithout) * 0.05),
            });
          } else {
            insights.push({
              insight_type: "weak_theme",
              insight_text: `💡 Your strong-hook posts are underperforming. Try opening with a clear value proposition or a specific number instead.`,
              platform: null,
              confidence: 0.6,
            });
          }
        }

        // CTA presence vs clicks
        const ctaCorr = correlatePattern(enriched, (p: any) => p.hasCta, clickMetric);
        if (ctaCorr && ctaCorr.lift > 0.3) {
          insights.push({
            insight_type: "winning_angle",
            insight_text: `📣 Posts with a clear CTA drive ${Math.round(ctaCorr.lift * 100)}% more clicks. Keep adding direct asks.`,
            platform: null,
            confidence: 0.75,
          });
        } else if (ctaCorr && ctaCorr.lift < -0.2) {
          insights.push({
            insight_type: "weak_cta",
            insight_text: `⚠️ Your CTAs aren't landing. Try simpler asks like "What's your take?" or "Reply with your biggest blocker."`,
            platform: null,
            confidence: 0.65,
          });
        } else if (enriched.filter((p: any) => !p.hasCta).length / enriched.length > 0.6) {
          insights.push({
            insight_type: "weak_cta",
            insight_text: `💡 Most of your posts lack a CTA. Adding one direct ask per post typically lifts clicks by 30%+.`,
            platform: null,
            confidence: 0.6,
          });
        }

        // Question presence vs engagement
        const qCorr = correlatePattern(enriched, (p: any) => p.hasQuestion, engMetric);
        if (qCorr && qCorr.lift > 0.4) {
          insights.push({
            insight_type: "winning_angle",
            insight_text: `❓ Posts ending with a question get ${Math.round(qCorr.lift * 100)}% more engagement. Lean into this.`,
            platform: null,
            confidence: 0.7,
          });
        }

        // Length bucket
        const buckets: Record<string, number[]> = { short: [], medium: [], long: [] };
        for (const p of enriched as any[]) buckets[p.lengthBucket].push(engMetric(p));
        const bucketAvgs = Object.entries(buckets)
          .filter(([_, arr]) => arr.length >= 2)
          .map(([k, arr]) => ({ bucket: k, avg: avg(arr), count: arr.length }))
          .sort((a, b) => b.avg - a.avg);
        if (bucketAvgs.length >= 2 && bucketAvgs[0].avg > bucketAvgs[bucketAvgs.length - 1].avg * 1.4) {
          const labels: Record<string, string> = {
            short: "Short posts (<150 chars)",
            medium: "Medium posts (150–400 chars)",
            long: "Long posts (>400 chars)",
          };
          insights.push({
            insight_type: "winning_angle",
            insight_text: `📏 ${labels[bucketAvgs[0].bucket]} are your top performers (${bucketAvgs[0].avg.toFixed(1)} avg engagements). Write more in this length.`,
            platform: null,
            confidence: 0.7,
          });
        }

        // Formatting
        const fmtCorr = correlatePattern(enriched, (p: any) => p.wellFormatted, engMetric);
        if (fmtCorr && fmtCorr.lift > 0.3) {
          insights.push({
            insight_type: "winning_angle",
            insight_text: `✨ Posts with line breaks between thoughts perform ${Math.round(fmtCorr.lift * 100)}% better. Keep the mobile-friendly formatting.`,
            platform: null,
            confidence: 0.65,
          });
        }

        // Best platform
        const platformStats = new Map<string, { eng: number; count: number }>();
        for (const p of posts) {
          const s = platformStats.get(p.platform) || { eng: 0, count: 0 };
          s.eng += p.engagements || 0;
          s.count += 1;
          platformStats.set(p.platform, s);
        }
        if (platformStats.size >= 2) {
          const ranked = Array.from(platformStats.entries())
            .map(([k, v]) => ({ platform: k, avg: v.eng / v.count, count: v.count }))
            .sort((a, b) => b.avg - a.avg);
          if (ranked[0].avg > ranked[ranked.length - 1].avg * 1.5 && ranked[0].count >= 2) {
            insights.push({
              insight_type: "winning_platform",
              insight_text: `🚀 ${ranked[0].platform} is your strongest channel — ${ranked[0].avg.toFixed(1)} avg engagements vs ${ranked[ranked.length - 1].avg.toFixed(1)} on ${ranked[ranked.length - 1].platform}.`,
              platform: ranked[0].platform,
              confidence: 0.75,
            });
          }
        }

        // Top post + AI explanation
        const topPost = [...posts].sort((a, b) => (b.engagements || 0) - (a.engagements || 0))[0];
        if (topPost && (topPost.engagements || 0) > 0) {
          const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
          let explanation = "";
          if (lovableApiKey) {
            try {
              const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { Authorization: `Bearer ${lovableApiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    {
                      role: "system",
                      content:
                        "You are a marketing coach. In 1–2 short sentences, explain why a specific social post performed well. Be concrete: reference its hook, structure, CTA, length, or angle. No generic advice. No filler. Plain text only.",
                    },
                    {
                      role: "user",
                      content: `Platform: ${topPost.platform}\nImpressions: ${topPost.impressions}\nEngagements: ${topPost.engagements}\nClicks: ${topPost.clicks}\n\nPost:\n${topPost.content_text}`,
                    },
                  ],
                  temperature: 0.4,
                }),
              });
              if (aiResp.ok) {
                const d = await aiResp.json();
                explanation = (d.choices?.[0]?.message?.content || "").trim();
              }
            } catch (e) {
              console.error("[LearningInsights] Top-post explanation failed:", e);
            }
          }
          if (explanation) {
            insights.push({
              insight_type: "top_post_explanation",
              insight_text: explanation,
              platform: topPost.platform,
              confidence: 0.8,
            });
          }
        }
      }

      // Insufficient data fallback
      if (insights.length === 0) {
        insights.push({
          insight_type: "recommendation",
          insight_text:
            posts.length === 0
              ? "Publish more posts to unlock insights — the system needs at least 4 published posts to detect patterns."
              : `You have ${posts.length} published post${posts.length === 1 ? "" : "s"}. Publish a few more to unlock pattern-based insights.`,
          platform: null,
          confidence: 0.5,
        });
      }

      // Replace previous insights for this app (keep history light)
      await supabase.from("learning_insights").delete().eq("app_id", app_id).eq("user_id", user_id);

      const { data: saved, error: insertError } = await supabase
        .from("learning_insights")
        .insert(
          insights.map((i) => ({
            app_id,
            user_id,
            platform: i.platform,
            insight_type: i.insight_type,
            insight_text: i.insight_text,
            confidence: i.confidence,
          }))
        )
        .select();

      if (insertError) {
        console.error(`[LearningInsights] Insert error for app ${app_id}:`, insertError);
        results.push({ app_id, error: insertError.message });
        continue;
      }

      await supabase.from("automation_audit_log").insert({
        user_id,
        action_type: "insights_generated",
        entity_type: "learning_insights",
        entity_id: app_id,
        details: { insights_count: saved?.length || 0, posts_analyzed: posts.length },
      });

      results.push({ app_id, count: saved?.length || 0, insights: saved });
    }

    return new Response(JSON.stringify({ results, processed: results.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[LearningInsights] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
