import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action = "campaign" | "landing" | "creative_set" | "save" | "dismiss";

const CREATIVE_VARIANTS = [
  { key: "executive", label: "Executive editorial", direction: "Calm, authoritative founder voice. Insight-led. Short punchy lines. Contrarian opening." },
  { key: "roi", label: "ROI / data dashboard", direction: "Lead with a concrete metric or before/after number. Frame as measurable business outcome." },
  { key: "industry", label: "Industry insight", direction: "Reference a market shift, trend or report. Position the reader as ahead of the curve." },
  { key: "founder", label: "Founder perspective", direction: "Personal, first-person. A lesson learned the hard way. Vulnerable but specific." },
];

async function callAI(system: string, user: string, json = true) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "{}";
  return json ? JSON.parse(text) : text;
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recommendation_id, action } = await req.json() as { recommendation_id: string; action: Action };
    if (!recommendation_id || !action) {
      return new Response(JSON.stringify({ error: "recommendation_id and action required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rec } = await supabase
      .from("growth_recommendations")
      .select("*")
      .eq("id", recommendation_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!rec) {
      return new Response(JSON.stringify({ error: "Recommendation not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Simple status-only actions ─────────────────────────────
    if (action === "save") {
      await supabase.from("growth_recommendations").update({ status: "saved" }).eq("id", rec.id);
      return new Response(JSON.stringify({ ok: true, status: "saved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "dismiss") {
      await supabase.from("growth_recommendations")
        .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
        .eq("id", rec.id);
      return new Response(JSON.stringify({ ok: true, status: "dismissed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Need app for everything below ──────────────────────────
    const { data: app } = await supabase.from("apps").select("*")
      .eq("id", rec.app_id).eq("user_id", user.id).maybeSingle();
    if (!app) {
      return new Response(JSON.stringify({ error: "App not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: personas }, { data: angles }] = await Promise.all([
      supabase.from("personas").select("id,title,pains,goals,objections,triggers").eq("app_id", app.id).limit(5),
      supabase.from("messaging_angles").select("angle_name,hook_template").eq("app_id", app.id).limit(5),
    ]);

    // ── ACTION: generate campaign brief ────────────────────────
    if (action === "campaign") {
      if (rec.campaign_id) {
        const { data: existing } = await supabase.from("campaigns").select("*").eq("id", rec.campaign_id).maybeSingle();
        if (existing) {
          return new Response(JSON.stringify({ ok: true, campaign: existing, already: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const system = `You are a senior growth strategist. Return ONLY JSON. No filler. Every choice must be tied to the recommendation's evidence.`;
      const prompt = `RECOMMENDATION
Title: ${rec.title}
Type: ${rec.recommendation_type}
Explanation: ${rec.explanation}
Confidence: ${rec.confidence_score}%
Expected impact: ${rec.expected_impact}

PRODUCT: ${app.name} — ${app.description ?? ""}
Audience: ${app.target_audience ?? ""}
Tone: ${app.brand_tone ?? "professional"}
Platforms enabled: ${(app.platforms ?? []).join(", ") || "linkedin"}

PERSONAS: ${JSON.stringify(personas ?? [])}
ANGLES IN USE: ${(angles ?? []).map((a:any)=>a.angle_name).join(", ")}

Produce a campaign brief as JSON:
{
  "campaign_name": "short, specific title (5-8 words)",
  "strategy_summary": "2-3 sentence strategy explicitly referencing the recommendation",
  "persona_id": "uuid from PERSONAS that best fits, or null",
  "journey_stage": "awareness | consideration | decision",
  "angle": "contrarian | proof | insight | story | data | objection",
  "platform": "one of the platforms enabled",
  "themes": ["3-5 short concrete themes"],
  "hook": "one opening line ready to publish (max 18 words, no buzzwords)",
  "cta": "specific call to action (3-6 words)"
}`;
      const plan = await callAI(system, prompt);

      const { data: campaign, error: cErr } = await supabase.from("campaigns").insert({
        app_id: app.id,
        user_id: user.id,
        campaign_name: plan.campaign_name?.slice(0, 120) || rec.title,
        strategy_summary: plan.strategy_summary ?? rec.explanation,
        themes: Array.isArray(plan.themes) ? plan.themes.slice(0, 6) : [],
        platform_mix: [plan.platform || (app.platforms?.[0] ?? "linkedin")],
        posting_frequency: 5,
        active: true,
        seed_recommendation_id: rec.id,
      }).select().single();
      if (cErr) throw cErr;

      await supabase.from("growth_recommendations").update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        campaign_id: campaign.id,
        persona_id: plan.persona_id ?? null,
        journey_stage: plan.journey_stage ?? null,
        angle: plan.angle ?? null,
        suggested_platform: plan.platform ?? null,
      }).eq("id", rec.id);

      await supabase.from("automation_audit_log").insert({
        user_id: user.id,
        action_type: "recommendation_accepted",
        entity_type: "growth_recommendation",
        entity_id: rec.id,
        details: { campaign_id: campaign.id, plan },
      });

      return new Response(JSON.stringify({ ok: true, campaign, plan }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: generate landing page ──────────────────────────
    if (action === "landing") {
      const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/generate-landing-copy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers.get("Authorization")!,
          apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        },
        body: JSON.stringify({ app_id: app.id, persona_id: rec.persona_id ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "landing copy failed");

      await supabase.from("growth_recommendations").update({
        landing_app_id: app.id,
        status: rec.status === "new" ? "accepted" : rec.status,
        accepted_at: rec.accepted_at ?? new Date().toISOString(),
      }).eq("id", rec.id);

      return new Response(JSON.stringify({ ok: true, landing: json.app }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: generate creative set (4 variants) ─────────────
    if (action === "creative_set") {
      const platform = rec.suggested_platform || app.platforms?.[0] || "linkedin";
      const persona = personas?.find((p: any) => p.id === rec.persona_id) || personas?.[0];

      const system = `You are a senior copywriter. Write platform-native posts. No buzzwords. No emojis unless natural. Return ONLY JSON.`;
      const prompt = `Generate 4 distinct creative variants for one campaign.

CAMPAIGN
Recommendation: ${rec.title}
Why: ${rec.explanation}
Persona: ${persona?.title ?? app.target_audience ?? "general audience"}
Persona pains: ${(persona?.pains ?? []).slice(0,3).join(" • ")}
Angle: ${rec.angle ?? "insight"}
Journey stage: ${rec.journey_stage ?? "awareness"}
Platform: ${platform}
Product: ${app.name} — ${app.description ?? ""}

VARIANTS (one per item, in this order):
${CREATIVE_VARIANTS.map((v,i)=>`${i+1}. ${v.label} — ${v.direction}`).join("\n")}

Return JSON: {"variants":[{"label":"...","content_text":"the full post, ready to publish"}, ... 4 items]}

Rules:
- ${platform === "linkedin" ? "150-280 words, mobile line breaks, hook in first line, end with question or CTA" : platform === "x" ? "max 270 chars, single thought, no hashtags chain" : "platform-native length and structure"}
- No "revolutionize", "unlock", "supercharge", "leverage", "game-changer".
- Each variant must be substantively different, not a reword.`;

      const out = await callAI(system, prompt);
      const variants: any[] = Array.isArray(out.variants) ? out.variants.slice(0, 4) : [];
      if (!variants.length) throw new Error("AI returned no variants");

      const rows = variants.map((v, i) => ({
        user_id: user.id,
        app_id: app.id,
        platform,
        content_text: (v.content_text || "").toString().slice(0, 5000),
        status: "pending",
        persona_id: rec.persona_id ?? null,
        journey_stage: rec.journey_stage ?? null,
        messaging_angle: rec.angle ?? CREATIVE_VARIANTS[i]?.key ?? null,
        seed_recommendation_id: rec.id,
      }));

      const { data: inserted, error: iErr } = await supabase.from("content").insert(rows).select("id");
      if (iErr) throw iErr;

      await supabase.from("growth_recommendations").update({
        status: "generated",
        creative_count: (rec.creative_count ?? 0) + inserted.length,
        accepted_at: rec.accepted_at ?? new Date().toISOString(),
      }).eq("id", rec.id);

      return new Response(JSON.stringify({ ok: true, count: inserted.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("execute-recommendation error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
