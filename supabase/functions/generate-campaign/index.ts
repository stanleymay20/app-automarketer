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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const { app_id, user_id } = await req.json();

    if (!app_id || !user_id) {
      return new Response(JSON.stringify({ error: "app_id and user_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[CampaignPlanner] Generating plan for app ${app_id}`);

    // Fetch app details
    const { data: app } = await supabase
      .from("apps")
      .select("*")
      .eq("id", app_id)
      .single();

    if (!app) {
      return new Response(JSON.stringify({ error: "App not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch active goal
    const { data: goals } = await supabase
      .from("growth_goals")
      .select("*")
      .eq("app_id", app_id)
      .eq("status", "active")
      .limit(1);

    const activeGoal = goals?.[0];

    // Fetch recent learning insights
    const { data: insights } = await supabase
      .from("learning_insights")
      .select("*")
      .eq("app_id", app_id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Fetch recent performance
    const { data: recentContent } = await supabase
      .from("content")
      .select("platform, status, impressions, engagements, clicks")
      .eq("app_id", app_id)
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(20);

    // Fetch automation policy
    const { data: policy } = await supabase
      .from("automation_policies")
      .select("*")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const context = {
      app: { name: app.name, description: app.description, tone: app.brand_tone, audience: app.target_audience, platforms: app.platforms },
      goal: activeGoal ? { type: activeGoal.goal_type, target: activeGoal.target_value, current: activeGoal.current_value, daysLeft: Math.ceil((new Date(activeGoal.end_date).getTime() - Date.now()) / 86400000) } : null,
      insights: insights?.map((i) => i.insight_text) || [],
      recentPerformance: {
        totalPosts: recentContent?.length || 0,
        avgImpressions: recentContent?.length ? Math.round(recentContent.reduce((s, c) => s + (c.impressions || 0), 0) / recentContent.length) : 0,
        avgEngagements: recentContent?.length ? Math.round(recentContent.reduce((s, c) => s + (c.engagements || 0), 0) / recentContent.length) : 0,
      },
      maxPostsPerDay: policy?.max_posts_per_day || 4,
    };

    const aiResponse = await fetch("https://ai.lovable.dev/api/v1/chat/completions", {
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
            content: `You are a marketing campaign strategist. Generate a 7-day content plan.

Context:
${JSON.stringify(context, null, 2)}

Return ONLY valid JSON:
{
  "campaign_name": "short descriptive name",
  "strategy_summary": "2-3 sentence strategy explanation",
  "themes": ["theme1", "theme2", "theme3"],
  "platform_mix": ["platform1", "platform2"],
  "posting_frequency": number_per_week,
  "daily_plan": [
    { "day": 1, "platform": "x", "theme": "...", "hook": "suggested opening line", "cta": "call to action" },
    ...
  ]
}`,
          },
          {
            role: "user",
            content: `Generate a weekly campaign plan for ${app.name}. ${activeGoal ? `Goal: ${activeGoal.goal_type} - reach ${activeGoal.target_value} in ${Math.ceil((new Date(activeGoal.end_date).getTime() - Date.now()) / 86400000)} days.` : "No specific goal set."}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");

    const plan = JSON.parse(jsonMatch[0]);

    // Save campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .insert({
        app_id,
        user_id,
        goal_id: activeGoal?.id || null,
        campaign_name: plan.campaign_name,
        strategy_summary: plan.strategy_summary,
        themes: plan.themes || [],
        platform_mix: plan.platform_mix || app.platforms || [],
        posting_frequency: plan.posting_frequency || 7,
        active: true,
      })
      .select()
      .single();

    if (campaignError) throw campaignError;

    // Audit log
    await supabase.from("automation_audit_log").insert({
      user_id,
      action_type: "campaign_created",
      entity_type: "campaign",
      entity_id: campaign.id,
      details: { plan },
    });

    console.log(`[CampaignPlanner] Created campaign: ${plan.campaign_name}`);

    return new Response(
      JSON.stringify({ campaign, plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[CampaignPlanner] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
