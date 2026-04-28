// Discover new grants via Perplexity web search
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoveredGrant {
  title: string;
  provider?: string;
  country?: string;
  deadline?: string | null;
  url: string;
  funding_amount?: string;
  eligibility_summary?: string;
  description?: string;
  tags?: string[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) throw new Error("PERPLEXITY_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    let body: { app_id?: string; profile?: string; focus?: string } = {};
    try { body = await req.json(); } catch (_) {}
    if (!body.app_id) {
      return new Response(JSON.stringify({ error: "app_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin0 = createClient(supabaseUrl, serviceKey);
    const { data: app, error: appErr } = await admin0
      .from("apps")
      .select("name, description, target_audience, primary_goal, website_url")
      .eq("id", body.app_id)
      .eq("user_id", userId)
      .single();
    if (appErr || !app) {
      return new Response(JSON.stringify({ error: "App not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = body.profile?.trim() || `Early-stage founder building "${app.name}". ${app.description ?? ""} Target audience: ${app.target_audience ?? "n/a"}. Primary goal: ${app.primary_goal ?? "n/a"}. Website: ${app.website_url ?? "n/a"}. Based in Germany (Berlin).`;
    const focus = body.focus?.trim() || `Germany and EU non-dilutive grants, accelerators, and innovation funding relevant specifically to "${app.name}" in 2026 (EXIST, Berlin Startup Scholarship, EIC Accelerator, Horizon Europe, Bundesregierung programs, sector-specific grants).`;

    // Perplexity structured search
    const prompt = `Find 8-12 currently open or upcoming funding opportunities matching this founder profile:
PROFILE: ${profile}
FOCUS: ${focus}

For each opportunity return title, provider, country, application URL, funding amount (text), deadline (YYYY-MM-DD if known else null), one-paragraph eligibility summary, and 3-5 tags.
Only include opportunities that are real and currently accepting (or will accept) applications.`;

    const perplexityRes = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          { role: "system", content: "You are a grants research analyst. Be precise, only return real currently-active programs, and never invent URLs." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            schema: {
              type: "object",
              properties: {
                grants: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      provider: { type: "string" },
                      country: { type: "string" },
                      url: { type: "string" },
                      funding_amount: { type: "string" },
                      deadline: { type: ["string", "null"] },
                      eligibility_summary: { type: "string" },
                      description: { type: "string" },
                      tags: { type: "array", items: { type: "string" } },
                    },
                    required: ["title", "url", "eligibility_summary"],
                  },
                },
              },
              required: ["grants"],
            },
          },
        },
      }),
    });

    if (!perplexityRes.ok) {
      const t = await perplexityRes.text();
      console.error("Perplexity error", perplexityRes.status, t);
      return new Response(JSON.stringify({ error: `Perplexity error ${perplexityRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pjson = await perplexityRes.json();
    const content = pjson.choices?.[0]?.message?.content ?? "{}";
    let parsed: { grants: DiscoveredGrant[] } = { grants: [] };
    try { parsed = JSON.parse(content); } catch (e) { console.error("Parse error", e, content); }

    const admin = admin0;
    const inserted: any[] = [];
    const skipped: string[] = [];

    for (const g of parsed.grants ?? []) {
      if (!g.url || !g.title) continue;
      // dedupe by user + app + url
      const { data: existing } = await admin
        .from("grants")
        .select("id")
        .eq("user_id", userId)
        .eq("app_id", body.app_id)
        .eq("url", g.url)
        .maybeSingle();
      if (existing) {
        skipped.push(g.title);
        continue;
      }
      const { data: row, error } = await admin
        .from("grants")
        .insert({
          user_id: userId,
          app_id: body.app_id,
          title: g.title,
          provider: g.provider ?? null,
          country: g.country ?? null,
          deadline: g.deadline || null,
          url: g.url,
          funding_amount: g.funding_amount ?? null,
          eligibility_summary: g.eligibility_summary ?? null,
          description: g.description ?? null,
          tags: g.tags ?? [],
          source: "perplexity",
          status: "new",
        })
        .select()
        .single();
      if (error) { console.error("insert error", error); continue; }
      inserted.push(row);
    }

    return new Response(
      JSON.stringify({ discovered: inserted.length, skipped: skipped.length, grants: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("discover-grants error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
