import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { app_id, persona_id } = await req.json();
    if (!app_id) {
      return new Response(JSON.stringify({ error: "app_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app } = await supabase
      .from("apps")
      .select("id, user_id, name, description, target_audience, primary_goal, brand_tone, website_url, landing_slug")
      .eq("id", app_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!app) {
      return new Response(JSON.stringify({ error: "app not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Audience context
    const { data: personas } = await supabase
      .from("personas").select("id, title, pains, goals, objections, triggers")
      .eq("app_id", app_id).limit(4);

    const targetPersona = persona_id
      ? personas?.find((p) => p.id === persona_id)
      : personas?.[0];

    const { data: angles } = await supabase
      .from("messaging_angles").select("angle_name, hook_template, when_to_use")
      .eq("app_id", app_id).limit(4);

    // Top performing insights (if any) to anchor copy
    const { data: insights } = await supabase
      .from("learning_insights").select("insight_text, insight_type")
      .eq("app_id", app_id).order("created_at", { ascending: false }).limit(6);

    const sys = `You are a senior conversion copywriter who has written landing pages for category-defining SaaS companies (Linear, Stripe, Notion, Vercel). You write the way a thoughtful founder talks to a peer — specific, calm, never hyped.

ABSOLUTE RULES:
- Never use: revolutionize, unlock, leverage, supercharge, game-changer, next-generation, cutting-edge, seamless, empower, harness, transform, elevate, in today's fast-paced.
- Headline: one concrete outcome. 5–10 words. No metaphors.
- Subheadline: who it's for + the change they get. One sentence, under 22 words.
- Features (3): each is an outcome, not a feature name. {title: 4-7 words, description: 12-22 words, icon: one of [zap, target, trendingUp, shield, sparkles, layers, rocket, clock, users, check]}
- Social proof (2-3 items): realistic-feeling testimonials OR concrete stats. If a stat: {kind:"stat", value:"2.3x", label:"more replies"}. If a testimonial: {kind:"quote", quote:"…", author:"First L.", role:"Title at Co"}. Keep modest.
- Objections (3): the real doubts this persona has, each answered in one sentence. {question:"…", answer:"…"}
- CTA: 2-4 words. Action-first. Specific (not "Get started").
- Brand color: pick one hex that fits the tone (calm professional = deep blue, creative = warm coral, dev/technical = near-black, wellness = sage). Return as #RRGGBB.

Return STRICT JSON only:
{"headline":"","subheadline":"","cta":"","features":[{"title":"","description":"","icon":""}],"proof":[],"objections":[{"question":"","answer":""}],"brand_color":"#000000"}`;

    const usr = `Product: ${app.name}
What it does: ${app.description || "n/a"}
Audience: ${app.target_audience || "n/a"}
Goal: ${app.primary_goal || "n/a"}
Tone: ${app.brand_tone || "professional"}
${targetPersona ? `\nPrimary persona: ${targetPersona.title}
Pains: ${(targetPersona.pains || []).slice(0,4).join(" • ")}
Goals: ${(targetPersona.goals || []).slice(0,3).join(" • ")}
Objections: ${(targetPersona.objections || []).slice(0,3).join(" • ")}
Triggers: ${(targetPersona.triggers || []).slice(0,3).join(" • ")}` : ""}
${angles?.length ? `\nMessaging angles in use: ${angles.map(a => a.angle_name).join(", ")}` : ""}
${insights?.length ? `\nWhat is working: ${insights.map(i => i.insight_text).slice(0,4).join(" | ")}` : ""}`;

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: usr },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI ${res.status}: ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(text); } catch { parsed = {}; }

    const headline = (parsed.headline || "").toString().trim().slice(0, 120) || app.name;
    const subheadline = (parsed.subheadline || "").toString().trim().slice(0, 240);
    const cta = (parsed.cta || "Get early access").toString().trim().slice(0, 40);
    const features = Array.isArray(parsed.features) ? parsed.features.slice(0, 4) : [];
    const proof = Array.isArray(parsed.proof) ? parsed.proof.slice(0, 4) : [];
    const objections = Array.isArray(parsed.objections) ? parsed.objections.slice(0, 4) : [];
    const brandColor = typeof parsed.brand_color === "string" && /^#[0-9a-fA-F]{6}$/.test(parsed.brand_color)
      ? parsed.brand_color : null;

    const baseSlug = (app.name || "app")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "app";
    const slug = `${baseSlug}-${app.id.slice(0, 6)}`;

    const updates: Record<string, any> = {
      landing_headline: headline,
      landing_subheadline: subheadline,
      landing_cta_label: cta,
      landing_features: features,
      landing_proof: proof,
      landing_objections: objections,
      landing_enabled: true,
      landing_template: "executive",
    };
    if (brandColor) updates.landing_brand_color = brandColor;
    if (targetPersona?.id) updates.landing_persona_id = targetPersona.id;
    if (!app.landing_slug) updates.landing_slug = slug;

    const { data: updated, error: upErr } = await supabase
      .from("apps").update(updates).eq("id", app_id).select().single();
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, app: updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-landing-copy error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
