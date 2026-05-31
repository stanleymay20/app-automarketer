import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

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
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI ${res.status}: ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? (json ? "{}" : "");
  return json ? JSON.parse(text) : text;
}

interface OrchestrateBody {
  app_id: string;
  persona_id?: string | null;
  journey_stage?: string | null;
  messaging_angle?: string | null;
  goal?: string | null;
  goal_id?: string | null;
  seed_recommendation_id?: string | null;
  campaign_name?: string | null;
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

    const body = (await req.json()) as OrchestrateBody;
    if (!body.app_id) {
      return new Response(JSON.stringify({ error: "app_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app } = await supabase.from("apps").select("*").eq("id", body.app_id).eq("user_id", user.id).maybeSingle();
    if (!app) {
      return new Response(JSON.stringify({ error: "App not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let persona: any = null;
    if (body.persona_id) {
      const { data } = await supabase.from("personas").select("*").eq("id", body.persona_id).maybeSingle();
      persona = data;
    }
    let angle: any = null;
    if (body.messaging_angle) {
      const { data } = await supabase.from("messaging_angles").select("*").eq("app_id", body.app_id).eq("angle_name", body.messaging_angle).maybeSingle();
      angle = data;
    }

    const personaSummary = persona
      ? `${persona.title} | pains: ${(persona.pains ?? []).join(", ")} | goals: ${(persona.goals ?? []).join(", ")} | objections: ${(persona.objections ?? []).join(", ")}`
      : (app.target_audience ?? "general audience");

    const context = `
APP: ${app.name}
DESCRIPTION: ${app.description ?? ""}
BRAND TONE: ${app.brand_tone ?? "professional"}
TARGET AUDIENCE: ${app.target_audience ?? ""}
PERSONA: ${personaSummary}
JOURNEY STAGE: ${body.journey_stage ?? "consideration"}
MESSAGING ANGLE: ${body.messaging_angle ?? "default"} ${angle?.hook_template ? `(hook: ${angle.hook_template})` : ""}
GOAL: ${body.goal ?? "drive qualified leads"}
`.trim();

    // ── 1. Create campaign row ────────────────────────────────
    const campaignName = body.campaign_name ?? `${app.name} — ${body.messaging_angle ?? "Growth"} — ${new Date().toISOString().slice(0, 10)}`;
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        app_id: app.id,
        goal_id: body.goal_id ?? null,
        campaign_name: campaignName,
        strategy_summary: `Persona: ${persona?.title ?? "n/a"} • Stage: ${body.journey_stage ?? "n/a"} • Angle: ${body.messaging_angle ?? "n/a"}`,
        themes: [body.messaging_angle ?? "growth"],
        platform_mix: ["linkedin", "x"],
        seed_recommendation_id: body.seed_recommendation_id ?? null,
        active: true,
        posting_frequency: 4,
      })
      .select()
      .single();
    if (campErr || !campaign) throw new Error(`campaign insert failed: ${campErr?.message}`);

    // ── 2. AI generates the whole campaign payload in ONE call ─
    const system = `You generate complete marketing campaigns. Return strict JSON. Write like a human, not an AI. No buzzwords (e.g. "revolutionize", "unleash", "leverage synergies"). Be specific, concrete, evidence-based.`;
    const prompt = `${context}

Return JSON with this exact shape:
{
  "linkedin_posts": [string,string,string,string]  // 4 platform-native LinkedIn posts. Each 700-1400 chars, executive tone, 3-5 hashtags, line breaks, ONE crisp insight per post tied to the persona+angle.
  "x_posts": [string,string,string,string]         // 4 X/Twitter posts under 270 chars. Punchy, contrarian when fitting. 0-2 hashtags.
  "landing_variants": [
    { "headline": string, "subheadline": string, "cta_label": string, "features": [string,string,string], "proof": [string,string], "objections": [string,string] },
    { "headline": string, "subheadline": string, "cta_label": string, "features": [string,string,string], "proof": [string,string], "objections": [string,string] }
  ],
  "lead_magnet": { "title": string, "format": string, "outline": [string,string,string,string,string], "promise": string },
  "outreach_sequence": [
    { "step": 1, "channel": "email"|"linkedin_dm", "subject": string, "body": string },
    { "step": 2, "channel": "email"|"linkedin_dm", "subject": string, "body": string },
    { "step": 3, "channel": "email"|"linkedin_dm", "subject": string, "body": string }
  ],
  "distribution_strategy": { "summary": string, "channels": [ { "name": string, "why": string, "first_action": string } ] }, // 3-5 channels
  "creative_brief": { "big_idea": string, "tone": string, "do": [string,string,string], "dont": [string,string], "key_message": string, "proof_points": [string,string,string] },
  "image_brief": { "concept": string, "style": string, "composition": string, "color_palette": [string,string,string], "subject": string, "negative": string, "ai_prompt": string }, // ai_prompt must be ready to paste into an image model
  "video_brief": { "concept": string, "format": string, "duration_seconds": number, "hook": string, "beats": [string,string,string,string], "cta": string, "captions_style": string }
}

Critical:
- Posts must read like the persona's peer wrote them.
- Landing variants must be DIFFERENT angles (e.g. v1 = ROI proof, v2 = founder story).
- Image brief ai_prompt: editorial/McKinsey style, no people unless persona demands it, brand colors implied.
- No placeholder text. Everything specific to THIS app and persona.`;

    const payload = await callAI(system, prompt, true);

    // ── 3. Insert content rows for posts ──────────────────────
    const baseTime = Date.now();
    const contentRows: any[] = [];
    const buildRow = (platform: string, text: string, i: number) => ({
      user_id: user.id,
      app_id: app.id,
      platform,
      content_text: text,
      status: "pending",
      scheduled_for: new Date(baseTime + (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
      persona_id: body.persona_id ?? null,
      journey_stage: body.journey_stage ?? null,
      messaging_angle: body.messaging_angle ?? null,
      seed_recommendation_id: body.seed_recommendation_id ?? null,
    });
    (payload.linkedin_posts ?? []).slice(0, 4).forEach((t: string, i: number) => contentRows.push(buildRow("linkedin", t, i)));
    (payload.x_posts ?? []).slice(0, 4).forEach((t: string, i: number) => contentRows.push(buildRow("x", t, i + 4)));

    const { data: insertedContent } = await supabase.from("content").insert(contentRows).select();

    // ── 4. Insert campaign_assets for everything ──────────────
    const assets: any[] = [];
    const pushAsset = (asset_type: string, title: string, bodyText: string | null, metadata: any = {}, ref_id?: string) => {
      assets.push({
        user_id: user.id,
        campaign_id: campaign.id,
        app_id: app.id,
        asset_type,
        ref_table: ref_id ? "content" : null,
        ref_id: ref_id ?? null,
        title,
        body: bodyText,
        metadata,
      });
    };

    (insertedContent ?? []).forEach((c: any) => {
      pushAsset(c.platform === "linkedin" ? "linkedin_post" : "x_post", `${c.platform} post`, c.content_text, { content_id: c.id }, c.id);
    });

    (payload.landing_variants ?? []).forEach((v: any, i: number) => {
      pushAsset("landing_variant", `Landing variant ${i + 1}: ${v.headline ?? ""}`, v.subheadline ?? "", v);
    });

    pushAsset("lead_magnet", payload.lead_magnet?.title ?? "Lead magnet", payload.lead_magnet?.promise ?? "", payload.lead_magnet ?? {});

    (payload.outreach_sequence ?? []).forEach((s: any) => {
      pushAsset("outreach_email", `Step ${s.step}: ${s.subject ?? ""}`, s.body ?? "", s);
    });

    pushAsset("distribution_plan", "Distribution strategy", payload.distribution_strategy?.summary ?? "", payload.distribution_strategy ?? {});
    pushAsset("creative_brief", "Creative brief", payload.creative_brief?.big_idea ?? "", payload.creative_brief ?? {});
    pushAsset("image_brief", "Image brief", payload.image_brief?.concept ?? "", payload.image_brief ?? {});
    pushAsset("video_brief", "Video brief", payload.video_brief?.concept ?? "", payload.video_brief ?? {});

    if (assets.length > 0) {
      await supabase.from("campaign_assets").insert(assets);
    }

    // ── 5. If seeded from a recommendation, link it ───────────
    if (body.seed_recommendation_id) {
      await supabase.from("growth_recommendations").update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        campaign_id: campaign.id,
        creative_count: (insertedContent ?? []).length,
      }).eq("id", body.seed_recommendation_id);
    }

    // ── 6. Audit ──────────────────────────────────────────────
    await supabase.from("automation_audit_log").insert({
      user_id: user.id,
      action_type: "campaign_orchestrated",
      entity_type: "campaign",
      entity_id: campaign.id,
      details: { assets: assets.length, posts: (insertedContent ?? []).length },
    });

    return new Response(JSON.stringify({
      campaign_id: campaign.id,
      campaign_name: campaign.campaign_name,
      counts: {
        posts: (insertedContent ?? []).length,
        assets: assets.length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("orchestrate-campaign error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
