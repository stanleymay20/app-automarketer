import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { app_id } = await req.json();
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
      .select("id, user_id, name, description, target_audience, primary_goal, brand_tone, website_url")
      .eq("id", app_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!app) {
      return new Response(JSON.stringify({ error: "app not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull audience context if present
    const { data: personas } = await supabase
      .from("personas").select("title, pains, goals").eq("app_id", app_id).limit(2);
    const { data: angles } = await supabase
      .from("messaging_angles").select("angle_name, hook_template").eq("app_id", app_id).limit(3);

    const sys = `You write conversion-focused landing page copy for indie SaaS / digital products.
Rules:
- Headline: 4–10 words. Specific outcome. No buzzwords. NEVER use: revolutionize, unlock, leverage, supercharge, game-changer, next-generation.
- Subheadline: one sentence, max 18 words. Concrete benefit + who it's for.
- CTA: 2–4 words. Action-first.
Return STRICT JSON only: {"headline":"","subheadline":"","cta":""}`;

    const usr = `App: ${app.name}
Description: ${app.description || "n/a"}
Audience: ${app.target_audience || "n/a"}
Goal: ${app.primary_goal || "n/a"}
Tone: ${app.brand_tone || "professional"}
${personas?.length ? `Personas: ${personas.map(p => `${p.title} — pains: ${(p.pains || []).slice(0,2).join("; ")}`).join(" | ")}` : ""}
${angles?.length ? `Angles: ${angles.map(a => a.angle_name).join(", ")}` : ""}`;

    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) throw new Error("LOVABLE_API_KEY missing");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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

    const headline = (parsed.headline || "").toString().trim().slice(0, 120);
    const subheadline = (parsed.subheadline || "").toString().trim().slice(0, 240);
    const cta = (parsed.cta || "Get early access").toString().trim().slice(0, 40);

    // Generate slug if missing
    const baseSlug = (app.name || "app")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "app";
    const slug = `${baseSlug}-${app.id.slice(0, 6)}`;

    const updates: Record<string, any> = {
      landing_headline: headline || app.name,
      landing_subheadline: subheadline,
      landing_cta_label: cta,
      landing_enabled: true,
    };
    // only set slug if app has none
    const { data: cur } = await supabase.from("apps").select("landing_slug").eq("id", app_id).maybeSingle();
    if (!cur?.landing_slug) updates.landing_slug = slug;

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
