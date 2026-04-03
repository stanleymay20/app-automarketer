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

    const { content_id, content_text, platform, app_id, user_id } = await req.json();

    if (!content_id || !content_text) {
      return new Response(JSON.stringify({ error: "content_id and content_text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[QualityGate] Scoring content ${content_id}`);

    // Fetch app details for brand alignment check
    let appContext = "";
    if (app_id) {
      const { data: app } = await supabase
        .from("apps")
        .select("name, description, brand_tone, target_audience")
        .eq("id", app_id)
        .single();
      if (app) {
        appContext = `App: ${app.name}. Tone: ${app.brand_tone || "professional"}. Audience: ${app.target_audience || "general"}.`;
      }
    }

    // Score using AI
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    let scores = {
      quality_score: 75,
      clarity_score: 80,
      brand_score: 75,
      risk_score: 10,
      conversion_score: 70,
    };

    if (lovableApiKey) {
      try {
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
                content: `You are a content quality scoring engine. Score the following marketing post on these dimensions (0-100):
- quality_score: overall quality, grammar, readability
- clarity_score: message clarity, coherence
- brand_score: alignment with brand tone and audience
- risk_score: risk of being flagged, spammy, or controversial (0=safe, 100=risky)
- conversion_score: likelihood to drive action (clicks, signups)

Context: ${appContext}
Platform: ${platform || "unknown"}

Respond ONLY with valid JSON: {"quality_score":N,"clarity_score":N,"brand_score":N,"risk_score":N,"conversion_score":N,"reasons":"brief explanation"}`,
              },
              { role: "user", content: content_text },
            ],
            temperature: 0.3,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const parsed = JSON.parse(aiData.choices[0].message.content);
          scores = {
            quality_score: parsed.quality_score ?? 75,
            clarity_score: parsed.clarity_score ?? 80,
            brand_score: parsed.brand_score ?? 75,
            risk_score: parsed.risk_score ?? 10,
            conversion_score: parsed.conversion_score ?? 70,
          };
          var reasons = parsed.reasons || "";
        }
      } catch (aiErr) {
        console.error("[QualityGate] AI scoring failed, using defaults:", aiErr);
      }
    }

    // Fetch automation policy
    let autoApproved = false;
    if (user_id) {
      const { data: policy } = await supabase
        .from("automation_policies")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      if (policy?.auto_approve_enabled) {
        const minScore = policy.min_quality_score || 85;
        autoApproved =
          scores.quality_score >= minScore &&
          scores.risk_score <= 20 &&
          scores.brand_score >= 80;

        console.log(`[QualityGate] Auto-approve check: quality=${scores.quality_score} risk=${scores.risk_score} brand=${scores.brand_score} → ${autoApproved}`);
      }
    }

    // Upsert score
    const { error: scoreError } = await supabase
      .from("content_scores")
      .upsert({
        content_id,
        ...scores,
        auto_approved: autoApproved,
        reasons: reasons || null,
      }, { onConflict: "content_id" });

    if (scoreError) {
      console.error("[QualityGate] Failed to save score:", scoreError);
      throw scoreError;
    }

    // Auto-approve the content if thresholds pass
    if (autoApproved) {
      await supabase
        .from("content")
        .update({ status: "approved" })
        .eq("id", content_id)
        .eq("status", "pending");

      // Audit log
      await supabase.from("automation_audit_log").insert({
        user_id,
        action_type: "auto_approve",
        entity_type: "content",
        entity_id: content_id,
        details: { scores, reasons: reasons || null },
      });

      console.log(`[QualityGate] Content ${content_id} auto-approved`);
    }

    return new Response(
      JSON.stringify({
        scores,
        auto_approved: autoApproved,
        reasons: reasons || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[QualityGate] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
