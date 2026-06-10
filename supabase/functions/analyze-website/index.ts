// Quick URL → {name, description, target_audience, brand_tone, themes} for onboarding reveal.
// Uses Firecrawl scrape + Lovable AI Gateway (Gemini). No DB writes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TONES = ["professional", "casual", "playful", "technical", "inspiring"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    // Auth required (don't burn credits for anon)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") throw new Error("url required");

    // Normalize URL
    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

    // 1. Firecrawl scrape
    let markdown = "";
    let title = "";
    let description = "";
    try {
      const fcCtl = new AbortController();
      const fcTimer = setTimeout(() => fcCtl.abort(), 20_000);
      const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized, formats: ["markdown"], onlyMainContent: true }),
        signal: fcCtl.signal,
      });
      clearTimeout(fcTimer);
      if (!fcRes.ok) {
        const txt = await fcRes.text();
        throw new Error(`Firecrawl ${fcRes.status}: ${txt.slice(0, 200)}`);
      }
      const fc = await fcRes.json();
      markdown = (fc.markdown || fc.data?.markdown || "").slice(0, 8000);
      const meta = fc.metadata || fc.data?.metadata || {};
      title = meta.title || "";
      description = meta.description || "";
    } catch (e: any) {
      return new Response(JSON.stringify({ error: `Couldn't reach that site. ${e.message}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!markdown && !title) {
      return new Response(JSON.stringify({ error: "Site returned no readable content." }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Extract structured info with Gemini
    const prompt = `You are analyzing a website to help a marketer set up automated marketing for it.

Website URL: ${normalized}
Page title: ${title}
Meta description: ${description}

Page content (markdown, truncated):
"""
${markdown}
"""

Return ONLY valid JSON with this exact shape:
{
  "name": "short product/app name (2-4 words max)",
  "description": "one-sentence description of what it does, plain language, no buzzwords",
  "target_audience": "who it's for, specific (e.g. 'indie SaaS founders', not 'businesses')",
  "brand_tone": "one of: professional | casual | playful | technical | inspiring",
  "key_themes": ["3-5 short topic keywords the brand talks about"],
  "value_props": ["2-4 short outcome statements customers care about"]
}

Rules: No marketing buzzwords (revolutionize, leverage, synergy, cutting-edge). Be specific. If you can't tell from the content, say "Unknown".`;

    const aiCtl = new AbortController();
    const aiTimer = setTimeout(() => aiCtl.abort(), 60_000);
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal: aiCtl.signal,
    });
    clearTimeout(aiTimer);

    if (!aiRes.ok) {
      const t = await aiRes.text();
      throw new Error(`AI ${aiRes.status}: ${t.slice(0, 200)}`);
    }
    const ai = await aiRes.json();
    const content = ai.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const tone = TONES.includes(parsed.brand_tone) ? parsed.brand_tone : "professional";

    return new Response(JSON.stringify({
      url: normalized,
      name: String(parsed.name || title || "").slice(0, 60),
      description: String(parsed.description || description || ""),
      target_audience: String(parsed.target_audience || ""),
      brand_tone: tone,
      key_themes: Array.isArray(parsed.key_themes) ? parsed.key_themes.slice(0, 5) : [],
      value_props: Array.isArray(parsed.value_props) ? parsed.value_props.slice(0, 4) : [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("analyze-website", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
