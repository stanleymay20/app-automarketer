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

    const { app_id, user_id } = await req.json();
    if (!app_id || !user_id) {
      return new Response(JSON.stringify({ error: "app_id and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[LearningInsights] Generating insights for app ${app_id}`);

    // ── 1. Gather data ──────────────────────────────────────────────

    const [
      { data: app },
      { data: goal },
      { data: campaign },
      { data: publishedContent },
    ] = await Promise.all([
      supabase.from("apps").select("name, platforms, brand_tone, target_audience").eq("id", app_id).single(),
      supabase.from("growth_goals").select("*").eq("app_id", app_id).eq("status", "active").limit(1).maybeSingle(),
      supabase.from("campaigns").select("*").eq("app_id", app_id).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("content").select("id, platform, content_text, status, impressions, engagements, clicks").eq("app_id", app_id).eq("status", "published").order("published_at", { ascending: false }).limit(50),
    ]);

    const contentIds = (publishedContent || []).map((c: any) => c.id);

    let signals: any[] = [];
    let scores: any[] = [];

    if (contentIds.length > 0) {
      const [sigResult, scoreResult] = await Promise.all([
        supabase.from("performance_signals").select("*").in("content_id", contentIds),
        supabase.from("content_scores").select("*").in("content_id", contentIds),
      ]);
      signals = sigResult.data || [];
      scores = scoreResult.data || [];
    }

    console.log(`[LearningInsights] Data: ${publishedContent?.length || 0} published, ${signals.length} signals, ${scores.length} scores`);

    // ── 2. Build stats for rule-based fallback ──────────────────────

    const platformStats = new Map<string, { impressions: number; engagements: number; clicks: number; count: number }>();
    for (const c of publishedContent || []) {
      const s = platformStats.get(c.platform) || { impressions: 0, engagements: 0, clicks: 0, count: 0 };
      s.impressions += c.impressions || 0;
      s.engagements += c.engagements || 0;
      s.clicks += c.clicks || 0;
      s.count += 1;
      platformStats.set(c.platform, s);
    }

    const scoreMap = new Map(scores.map((s: any) => [s.content_id, s]));

    // Identify weak CTAs: high impressions but low clicks
    const weakCtaPosts = (publishedContent || []).filter((c: any) => {
      return (c.impressions || 0) > 50 && (c.clicks || 0) < 2;
    });

    // Low quality + low engagement
    const weakContentPosts = (publishedContent || []).filter((c: any) => {
      const score = scoreMap.get(c.id);
      return score && score.quality_score < 70 && (c.engagements || 0) < 5;
    });

    // ── 3. Try AI-powered analysis ──────────────────────────────────

    let insights: Array<{ insight_type: string; insight_text: string; platform: string | null; confidence: number }> = [];

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (lovableApiKey && (publishedContent?.length || 0) > 0) {
      try {
        const analysisData = {
          app: { name: app?.name, tone: app?.brand_tone, audience: app?.target_audience },
          goal: goal ? { type: goal.goal_type, target: goal.target_value, current: goal.current_value } : null,
          campaign: campaign ? { name: campaign.campaign_name, themes: campaign.themes } : null,
          platformStats: Object.fromEntries(
            Array.from(platformStats.entries()).map(([k, v]) => [k, { ...v, avgImpressions: Math.round(v.impressions / v.count), avgEngagements: Math.round(v.engagements / v.count) }])
          ),
          weakCtaCount: weakCtaPosts.length,
          weakContentCount: weakContentPosts.length,
          totalPublished: publishedContent?.length || 0,
          samplePosts: (publishedContent || []).slice(0, 10).map((c: any) => ({
            platform: c.platform,
            text: c.content_text.substring(0, 120),
            impressions: c.impressions,
            engagements: c.engagements,
            clicks: c.clicks,
            qualityScore: scoreMap.get(c.id)?.quality_score,
          })),
        };

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are a marketing performance analyst. Analyze the data and produce 3-5 concise, actionable insights.

Each insight must be specific — reference actual numbers, platforms, or patterns. No generic advice.

${goal ? `The user's active goal is: ${goal.goal_type} (target: ${goal.target_value}, current: ${goal.current_value}). Prioritize insights that help reach this goal.` : ""}

Return ONLY valid JSON array:
[
  {
    "insight_type": "winning_platform|winning_angle|weak_cta|weak_theme|quality_issue|recommendation",
    "insight_text": "Short, specific insight (1-2 sentences max)",
    "platform": "x|linkedin|instagram|facebook|null",
    "confidence": 0.0-1.0
  }
]`,
              },
              { role: "user", content: JSON.stringify(analysisData) },
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices[0].message.content;
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            insights = JSON.parse(jsonMatch[0]);
            console.log(`[LearningInsights] AI generated ${insights.length} insights`);
          }
        } else {
          console.error(`[LearningInsights] AI failed: ${aiResponse.status}`);
        }
      } catch (aiErr) {
        console.error("[LearningInsights] AI analysis failed:", aiErr);
      }
    }

    // ── 4. Rule-based fallback if AI produced nothing ───────────────

    if (insights.length === 0) {
      console.log("[LearningInsights] Using rule-based fallback");

      // Best platform by avg engagements
      let bestPlatform = "";
      let bestAvgEng = 0;
      for (const [platform, stats] of platformStats) {
        const avg = stats.count > 0 ? stats.engagements / stats.count : 0;
        if (avg > bestAvgEng) {
          bestAvgEng = avg;
          bestPlatform = platform;
        }
      }
      if (bestPlatform) {
        insights.push({
          insight_type: "winning_platform",
          insight_text: `${bestPlatform} is your strongest platform with ${Math.round(bestAvgEng)} avg engagements per post.`,
          platform: bestPlatform,
          confidence: 0.7,
        });
      }

      // Weak CTA pattern
      if (weakCtaPosts.length >= 2) {
        insights.push({
          insight_type: "weak_cta",
          insight_text: `${weakCtaPosts.length} posts got impressions but almost no clicks — your call-to-action may need strengthening.`,
          platform: null,
          confidence: 0.65,
        });
      }

      // Weak content quality
      if (weakContentPosts.length >= 2) {
        insights.push({
          insight_type: "quality_issue",
          insight_text: `${weakContentPosts.length} low-scoring posts also had low engagement — consider raising the quality threshold.`,
          platform: null,
          confidence: 0.6,
        });
      }

      // Goal-aligned recommendation
      if (goal) {
        const progress = goal.target_value > 0 ? Math.round((goal.current_value / goal.target_value) * 100) : 0;
        if (progress < 30) {
          insights.push({
            insight_type: "recommendation",
            insight_text: `Goal progress is at ${progress}%. Consider increasing posting frequency or trying a different content angle to accelerate ${goal.goal_type}.`,
            platform: null,
            confidence: 0.55,
          });
        }
      }

      // Ensure at least one insight
      if (insights.length === 0) {
        insights.push({
          insight_type: "recommendation",
          insight_text: `You have ${publishedContent?.length || 0} published posts. Keep posting consistently to build enough data for pattern recognition.`,
          platform: null,
          confidence: 0.5,
        });
      }
    }

    // ── 5. Save insights ────────────────────────────────────────────

    const insightsToInsert = insights.map((i) => ({
      app_id,
      user_id,
      platform: i.platform || null,
      insight_type: i.insight_type,
      insight_text: i.insight_text,
      confidence: i.confidence,
    }));

    const { data: savedInsights, error: insertError } = await supabase
      .from("learning_insights")
      .insert(insightsToInsert)
      .select();

    if (insertError) {
      console.error("[LearningInsights] Insert error:", insertError);
      throw insertError;
    }

    // ── 6. Audit log ────────────────────────────────────────────────

    await supabase.from("automation_audit_log").insert({
      user_id,
      action_type: "insights_generated",
      entity_type: "learning_insights",
      entity_id: app_id,
      details: {
        insights_count: savedInsights?.length || 0,
        source: insights.length > 0 && lovableApiKey ? "ai" : "rules",
        data_points: {
          published_posts: publishedContent?.length || 0,
          signals: signals.length,
          scores: scores.length,
        },
      },
    });

    console.log(`[LearningInsights] Saved ${savedInsights?.length} insights for app ${app_id}`);

    return new Response(
      JSON.stringify({ insights: savedInsights, count: savedInsights?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[LearningInsights] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
