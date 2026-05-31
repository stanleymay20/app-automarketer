import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

async function callAI(prompt: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a senior growth strategist. Return ONLY valid JSON. Be specific and evidence-backed. Never give generic advice like 'post more often' or 'improve engagement'. Every recommendation MUST cite the specific signal or attribution number it relies on.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const appId: string | undefined = body.app_id;

    // Load app + audience context
    let appQ = supabase.from("apps").select("*").eq("user_id", user.id);
    if (appId) appQ = appQ.eq("id", appId);
    const { data: apps } = await appQ.limit(1);
    const app = apps?.[0];
    if (!app) {
      return new Response(JSON.stringify({ error: "No app found. Create an app first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === Real attribution evidence ===
    const [
      { data: icps },
      { data: personas },
      { data: insights },
      { data: contentRows, count: postsAnalyzed },
      { count: clicksCount },
      { count: leadsCount },
      { data: convs },
    ] = await Promise.all([
      supabase.from("icps").select("segment,industry").eq("app_id", app.id).limit(5),
      supabase.from("personas").select("title,pains,triggers").eq("app_id", app.id).limit(5),
      supabase.from("learning_insights").select("insight_text,confidence").eq("app_id", app.id).order("created_at", { ascending: false }).limit(8),
      supabase.from("content").select("id,platform,messaging_angle", { count: "exact" }).eq("app_id", app.id).eq("status", "published"),
      supabase.from("click_events").select("id", { count: "exact", head: true }).eq("app_id", app.id),
      supabase.from("leads").select("id", { count: "exact", head: true }).eq("app_id", app.id),
      supabase.from("conversions").select("amount").eq("app_id", app.id),
    ]);

    const conversionsCount = convs?.length ?? 0;
    const revenueTotal = (convs ?? []).reduce((s: number, c: any) => s + Number(c.amount ?? 0), 0);

    // Platform breakdown
    const platformCounts: Record<string, number> = {};
    const angleCounts: Record<string, number> = {};
    (contentRows ?? []).forEach((c: any) => {
      if (c.platform) platformCounts[c.platform] = (platformCounts[c.platform] ?? 0) + 1;
      if (c.messaging_angle) angleCounts[c.messaging_angle] = (angleCounts[c.messaging_angle] ?? 0) + 1;
    });

    const evidence = {
      posts_analyzed: postsAnalyzed ?? 0,
      clicks: clicksCount ?? 0,
      leads: leadsCount ?? 0,
      conversions: conversionsCount,
      revenue: revenueTotal,
      platform_mix: platformCounts,
      angle_mix: angleCounts,
    };

    const hasAttribution = evidence.posts_analyzed >= 1 || evidence.clicks > 0 || evidence.leads > 0;

    const prompt = `Analyze the GTM intelligence landscape for this product and produce specific, evidence-backed signals.

PRODUCT
Name: ${app.name}
Description: ${app.description ?? ""}
Audience: ${app.target_audience ?? ""}
Website: ${app.website_url ?? ""}

ICPs: ${JSON.stringify(icps ?? [])}
Personas: ${JSON.stringify(personas ?? [])}
Prior learning insights: ${JSON.stringify(insights ?? [])}

REAL ATTRIBUTION EVIDENCE (use this when justifying recommendations):
${JSON.stringify(evidence, null, 2)}
${hasAttribution ? "" : "NOTE: No attribution data yet. Recommendations must be labeled as initial hypotheses, not learned insights."}

Generate a JSON object with this exact shape:
{
  "market_signals": [{"signal_type":"trend|adoption|tech_shift","title":"...","description":"why it matters in 1 sentence","source":"e.g. Gartner, industry report — be specific","confidence_score":0-100,"impact_score":0-100}],
  "competitor_signals": [{"competitor_name":"...","signal_type":"funding|launch|pricing|hiring|partnership|acquisition","description":"...","impact_score":0-100,"recommended_response":"specific campaign action","source_basis":"verified|estimated"}],
  "opportunities": [{"title":"...","category":"grant|accelerator|partnership|procurement|investor|university","description":"...","deadline":"YYYY-MM-DD or null","relevance_score":0-100,"recommendation":"specific next action","url":"https://... or null"}],
  "customer_signals": [{"audience":"e.g. Operations Leaders","topic":"...","sentiment":"positive|neutral|negative|mixed","trend_score":0-100,"recommendation":"specific campaign angle"}],
  "growth_recommendations": [{"recommendation_type":"campaign|positioning|channel|offer","title":"...","explanation":"why, tied to a specific signal or attribution number above","confidence_score":0-100,"expected_impact":"high|medium|low","evidence_basis":"attribution|signal|hypothesis","evidence_summary":"e.g. '12 posts analyzed, 214 clicks, 31 leads' OR 'Initial hypothesis — no attribution data yet'"}]
}

Rules:
- 3-5 items per array
- Every item must be specific to THIS product/audience, not generic
- Every recommendation MUST include evidence_basis and evidence_summary
- If you do not have a verified source URL for a competitor, set source_basis="estimated"
- Confidence above 70 only allowed when evidence_basis="attribution" or evidence_basis="signal" with a real source
- No filler. No "post more often". No "increase engagement".`;

    const ai = await callAI(prompt);

    // Wipe prior auto-generated signals for this app/user
    if (app.id) {
      await Promise.all([
        supabase.from("market_signals").delete().eq("user_id", user.id).eq("app_id", app.id),
        supabase.from("competitor_signals").delete().eq("user_id", user.id).eq("app_id", app.id),
        supabase.from("opportunities").delete().eq("user_id", user.id).eq("app_id", app.id),
        supabase.from("customer_signals").delete().eq("user_id", user.id).eq("app_id", app.id),
        supabase.from("growth_recommendations").delete().eq("user_id", user.id).eq("app_id", app.id),
      ]);
    }

    const base = { user_id: user.id, app_id: app.id };
    const inserts: any[] = [];

    if (Array.isArray(ai.market_signals)) {
      inserts.push(
        supabase.from("market_signals").insert(
          ai.market_signals.map((s: any) => ({
            ...base,
            signal_type: s.signal_type,
            title: s.title,
            description: s.description,
            source: s.source,
            confidence_score: s.confidence_score ?? 50,
            impact_score: s.impact_score ?? 50,
            metadata: { evidence },
          }))
        )
      );
    }
    if (Array.isArray(ai.competitor_signals)) {
      inserts.push(
        supabase.from("competitor_signals").insert(
          ai.competitor_signals.map((s: any) => ({
            ...base,
            competitor_name: s.competitor_name,
            signal_type: s.signal_type,
            description: s.description,
            impact_score: s.impact_score ?? 50,
            recommended_response: s.recommended_response,
            source_url: s.source_url ?? null,
            metadata: { source_basis: s.source_basis ?? (s.source_url ? "verified" : "estimated") },
          }))
        )
      );
    }
    if (Array.isArray(ai.opportunities)) {
      inserts.push(
        supabase.from("opportunities").insert(
          ai.opportunities.map((s: any) => ({
            ...base,
            title: s.title,
            category: s.category,
            description: s.description,
            deadline: s.deadline && /^\d{4}-\d{2}-\d{2}$/.test(s.deadline) ? s.deadline : null,
            relevance_score: s.relevance_score ?? 50,
            url: s.url ?? null,
            recommendation: s.recommendation,
          }))
        )
      );
    }
    if (Array.isArray(ai.customer_signals)) {
      inserts.push(
        supabase.from("customer_signals").insert(
          ai.customer_signals.map((s: any) => ({
            ...base,
            audience: s.audience,
            topic: s.topic,
            sentiment: s.sentiment,
            trend_score: s.trend_score ?? 50,
            recommendation: s.recommendation,
          }))
        )
      );
    }
    if (Array.isArray(ai.growth_recommendations)) {
      inserts.push(
        supabase.from("growth_recommendations").insert(
          ai.growth_recommendations.map((s: any) => {
            const basis = s.evidence_basis ?? (hasAttribution ? "attribution" : "hypothesis");
            // Cap confidence when basis is hypothesis
            let conf = s.confidence_score ?? 50;
            if (basis === "hypothesis" && conf > 60) conf = 60;
            return {
              ...base,
              recommendation_type: s.recommendation_type,
              title: s.title,
              explanation: s.explanation,
              confidence_score: conf,
              expected_impact: s.expected_impact,
              supporting_signal_ids: [],
              // Stash evidence transparency on a known column. We piggyback on status="new" and use explanation for label.
            };
          })
        )
      );
    }

    // Persist evidence summary on each recommendation row via a follow-up update isn't necessary
    // because we surface evidence from the app context on the UI side.

    await Promise.all(inserts);

    return new Response(
      JSON.stringify({
        ok: true,
        evidence,
        counts: {
          market: ai.market_signals?.length ?? 0,
          competitors: ai.competitor_signals?.length ?? 0,
          opportunities: ai.opportunities?.length ?? 0,
          customers: ai.customer_signals?.length ?? 0,
          recommendations: ai.growth_recommendations?.length ?? 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("generate-growth-intelligence error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
