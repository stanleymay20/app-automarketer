import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_CRITERIA: Record<string, string> = {
  linkedin: `LinkedIn-specific criteria:
- Hook: First 1-2 lines must be scroll-stopping (contrarian, surprising, or provocative). Score 0 if it starts with "Excited to announce" or similar.
- Structure: Must have clear sections (hook → insight → value → CTA) with line breaks
- Tone: Executive, authoritative — NOT promotional or brochure-like
- CTA: Must end with engagement driver (question or reflection)
- Hashtags: 3-5 relevant industry hashtags required
- Red flags: buzzwords like "revolutionize", "game-changer", "seamless" → deduct 20 points from quality`,

  x: `X (Twitter)-specific criteria:
- Length: Must be ≤280 characters including hashtags
- Density: Every word must earn its place — no filler
- Hook: First 8 words must grab attention
- Hashtags: 2-3 max
- Red flags: more than 1 emoji, corporate-speak → deduct 20 points`,
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

    console.log(`[QualityGate] Scoring content ${content_id} for ${platform || "unknown"}`);

    // Fetch app details for brand alignment
    let appContext = "";
    if (app_id) {
      const { data: app } = await supabase
        .from("apps")
        .select("name, description, brand_tone, target_audience")
        .eq("id", app_id)
        .single();
      if (app) {
        appContext = `Company: ${app.name}. Product: ${app.description || "B2B SaaS"}. Tone: ${app.brand_tone || "professional"}. Audience: ${app.target_audience || "business leaders"}.`;
      }
    }

    const normalizedPlatform = (platform || "linkedin").toLowerCase()
      .replace("x (twitter)", "x").replace("twitter", "x");
    const platformCriteria = PLATFORM_CRITERIA[normalizedPlatform] || PLATFORM_CRITERIA["linkedin"];

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    let scores = {
      quality_score: 60,
      clarity_score: 60,
      brand_score: 60,
      risk_score: 15,
      conversion_score: 55,
    };
    let reasons = "";
    let shouldRegenerate = false;

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
                content: `You are a ruthlessly honest content quality scoring engine for a high-performance SaaS marketing platform. Your standards are ELITE — you score like a top LinkedIn ghostwriter who has built 100K+ audiences.

Score this ${normalizedPlatform.toUpperCase()} post on these dimensions (0-100):

1. **quality_score**: Overall quality. Grammar, readability, professionalism. Generic or AI-sounding content caps at 65.
2. **clarity_score**: Message clarity and coherence. Is there ONE clear idea? Is it specific, not vague?
3. **brand_score**: Alignment with brand voice and target audience. Does it sound human and authentic?
4. **risk_score**: Risk of appearing spammy, AI-generated, or controversial (0=safe, 100=risky). Heavy buzzword usage = 40+.
5. **conversion_score**: Likelihood to drive engagement (comments, shares, clicks). Weak hooks cap at 50.
6. **hook_strength**: How scroll-stopping is the opening? (0-100). Generic openings = 30 max.

${platformCriteria}

Brand context: ${appContext}

SCORING STANDARDS:
- 90-100: Would perform in top 5% of ${normalizedPlatform} content. Exceptional hook, clear insight, strong CTA.
- 75-89: Solid content. Good structure, clear message, publishable.
- 60-74: Mediocre. Needs improvement. May sound generic or lack punch.
- Below 60: Poor. Should be regenerated. Sounds like AI filler.

Also set "should_regenerate": true if quality_score < 65 OR hook_strength < 40 OR the content contains banned buzzwords.

Respond ONLY with valid JSON:
{"quality_score":N,"clarity_score":N,"brand_score":N,"risk_score":N,"conversion_score":N,"hook_strength":N,"should_regenerate":boolean,"reasons":"specific, actionable feedback"}`,
              },
              { role: "user", content: content_text },
            ],
            temperature: 0.2,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const rawContent = aiData.choices[0].message.content;
          // Extract JSON from possible markdown wrapper
          const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            scores = {
              quality_score: parsed.quality_score ?? 60,
              clarity_score: parsed.clarity_score ?? 60,
              brand_score: parsed.brand_score ?? 60,
              risk_score: parsed.risk_score ?? 15,
              conversion_score: parsed.conversion_score ?? 55,
            };
            reasons = parsed.reasons || "";
            shouldRegenerate = parsed.should_regenerate === true;

            console.log(`[QualityGate] Scores: quality=${scores.quality_score} clarity=${scores.clarity_score} brand=${scores.brand_score} risk=${scores.risk_score} conversion=${scores.conversion_score} hook=${parsed.hook_strength} regen=${shouldRegenerate}`);
          }
        }
      } catch (aiErr) {
        console.error("[QualityGate] AI scoring failed, using conservative defaults:", aiErr);
      }
    }

    // Fetch automation policy for auto-approve decision
    let autoApproved = false;
    if (user_id) {
      const { data: policy } = await supabase
        .from("automation_policies")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();

      if (policy?.auto_approve_enabled && !shouldRegenerate) {
        const minScore = policy.min_quality_score || 85;
        autoApproved =
          scores.quality_score >= minScore &&
          scores.risk_score <= 20 &&
          scores.brand_score >= 75 &&
          scores.clarity_score >= 70;

        console.log(`[QualityGate] Auto-approve: quality=${scores.quality_score}>=${minScore} risk=${scores.risk_score}<=20 brand=${scores.brand_score}>=75 clarity=${scores.clarity_score}>=70 → ${autoApproved}`);
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

    // Auto-approve if thresholds pass
    if (autoApproved) {
      await supabase
        .from("content")
        .update({ status: "approved" })
        .eq("id", content_id)
        .eq("status", "pending");

      await supabase.from("automation_audit_log").insert({
        user_id,
        action_type: "auto_approve",
        entity_type: "content",
        entity_id: content_id,
        details: { scores, reasons: reasons || null },
      });

      console.log(`[QualityGate] Content ${content_id} auto-approved`);
    } else if (shouldRegenerate) {
      console.log(`[QualityGate] Content ${content_id} flagged for regeneration: ${reasons}`);
    }

    return new Response(
      JSON.stringify({
        scores,
        auto_approved: autoApproved,
        should_regenerate: shouldRegenerate,
        reasons: reasons || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[QualityGate] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
