// Generate a tailored grant application draft via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STANDARD_QUESTIONS = [
  "What problem does your project solve?",
  "What is your unique solution and why now?",
  "Who is your target customer / user?",
  "What is your traction or evidence so far?",
  "How will you use the funding?",
  "Why are you (the founder/team) the right people to build this?",
  "What is your 12-month roadmap?",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = userData.user.id;

    const { grant_id } = await req.json();
    if (!grant_id) throw new Error("grant_id required");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: grant } = await admin.from("grants").select("*").eq("id", grant_id).eq("user_id", userId).single();
    if (!grant) throw new Error("Grant not found");

    const { data: apps } = await admin.from("apps").select("*").eq("user_id", userId).limit(3);
    const appContext = (apps ?? []).map(a => `App: ${a.name}\nDescription: ${a.description ?? ""}\nAudience: ${a.target_audience ?? ""}\nGoal: ${a.primary_goal ?? ""}\nWebsite: ${a.website_url ?? ""}`).join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You write grant applications for early-stage founders. Be specific, honest, and evidence-based. Avoid AI buzzwords. Write in first person ('We' / 'I')." },
          { role: "user", content: `GRANT:\nTitle: ${grant.title}\nProvider: ${grant.provider ?? ""}\nFunding: ${grant.funding_amount ?? ""}\nEligibility: ${grant.eligibility_summary ?? ""}\n\nFOUNDER CONTEXT:\n${appContext || "Solo AI/SaaS founder in Germany, MSc student."}\n\nGenerate (a) a 200-word tailored pitch and (b) a draft answer (120-180 words each) for these standard questions:\n${STANDARD_QUESTIONS.map((q,i) => `${i+1}. ${q}`).join("\n")}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "draft_application",
            parameters: {
              type: "object",
              properties: {
                pitch: { type: "string" },
                answers: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { question: { type: "string" }, answer: { type: "string" } },
                    required: ["question", "answer"],
                  },
                },
              },
              required: ["pitch", "answers"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "draft_application" } },
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await aiRes.text();
      throw new Error(`AI error ${status}: ${t}`);
    }
    const aiJson = await aiRes.json();
    const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : { pitch: "", answers: [] };

    // Upsert application (one draft per grant)
    const { data: existing } = await admin
      .from("grant_applications")
      .select("id")
      .eq("grant_id", grant_id)
      .eq("user_id", userId)
      .maybeSingle();

    let app;
    if (existing) {
      const { data, error } = await admin
        .from("grant_applications")
        .update({ generated_pitch: parsed.pitch, answers_json: { items: parsed.answers }, status: "draft" })
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      app = data;
    } else {
      const { data, error } = await admin
        .from("grant_applications")
        .insert({ user_id: userId, grant_id, generated_pitch: parsed.pitch, answers_json: { items: parsed.answers }, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      app = data;
    }

    return new Response(JSON.stringify({ application: app }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("generate-grant-application error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
