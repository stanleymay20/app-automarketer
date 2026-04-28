// Enrich a grant via Firecrawl + score fit via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    const userId = userData.user.id;

    const { grant_id } = await req.json();
    if (!grant_id) throw new Error("grant_id required");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: grant, error: gErr } = await admin
      .from("grants")
      .select("*")
      .eq("id", grant_id)
      .eq("user_id", userId)
      .single();
    if (gErr || !grant) throw new Error("Grant not found");

    // 1. Firecrawl scrape (markdown only, main content)
    let scrapedMarkdown = "";
    try {
      const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: grant.url, formats: ["markdown"], onlyMainContent: true }),
      });
      if (fcRes.ok) {
        const fc = await fcRes.json();
        scrapedMarkdown = (fc.markdown || fc.data?.markdown || "").slice(0, 12000);
      } else {
        console.warn("Firecrawl status", fcRes.status);
      }
    } catch (e) {
      console.warn("Firecrawl scrape failed", e);
    }

    // 2. Get user app context for fit scoring
    const { data: apps } = await admin.from("apps").select("name, description, target_audience, primary_goal").eq("user_id", userId).limit(3);
    const appContext = (apps ?? []).map(a => `- ${a.name}: ${a.description ?? ""} (audience: ${a.target_audience ?? "n/a"}, goal: ${a.primary_goal ?? "n/a"})`).join("\n");

    // 3. AI fit scoring via Lovable AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You evaluate grant fit for early-stage founders. Be honest and specific. Score 0-100. Concise reasoning." },
          { role: "user", content: `FOUNDER APPS:\n${appContext || "AI/SaaS founder, Germany, MSc student"}\n\nGRANT:\nTitle: ${grant.title}\nProvider: ${grant.provider}\nCountry: ${grant.country}\nFunding: ${grant.funding_amount}\nEligibility (summary): ${grant.eligibility_summary}\n\nDETAIL PAGE:\n${scrapedMarkdown || "(no detail scraped)"}\n\nRate fit and refresh eligibility_summary if needed.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_grant",
            description: "Score grant fit for the founder",
            parameters: {
              type: "object",
              properties: {
                fit_score: { type: "integer", minimum: 0, maximum: 100 },
                fit_reasoning: { type: "string" },
                eligibility_summary: { type: "string" },
                deadline: { type: ["string", "null"], description: "YYYY-MM-DD or null" },
                funding_amount: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
              },
              required: ["fit_score", "fit_reasoning"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_grant" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      const t = await aiRes.text();
      console.error("AI error", status, t);
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error ${status}`);
    }
    const aiJson = await aiRes.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { fit_score: 0, fit_reasoning: "No score returned" };

    const updates: any = {
      fit_score: parsed.fit_score,
      fit_reasoning: parsed.fit_reasoning,
      enriched_at: new Date().toISOString(),
      status: parsed.fit_score >= 60 ? "qualified" : grant.status === "new" ? "new" : grant.status,
    };
    if (parsed.eligibility_summary) updates.eligibility_summary = parsed.eligibility_summary;
    if (parsed.deadline) updates.deadline = parsed.deadline;
    if (parsed.funding_amount) updates.funding_amount = parsed.funding_amount;
    if (parsed.tags?.length) updates.tags = parsed.tags;

    const { data: updated, error: uErr } = await admin
      .from("grants")
      .update(updates)
      .eq("id", grant_id)
      .select()
      .single();
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ grant: updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("qualify-grant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
