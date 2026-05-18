import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppDetails {
  id?: string;
  name: string;
  description: string | null;
  target_audience: string | null;
  brand_tone: string | null;
  platforms: string[];
}

async function fetchInsightDirectives(appId?: string): Promise<{ optimizeFor: string[]; avoid: string[] }> {
  if (!appId) return { optimizeFor: [], avoid: [] };
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: insights } = await supabase
      .from("learning_insights")
      .select("insight_type, insight_text, confidence")
      .eq("app_id", appId)
      .order("confidence", { ascending: false })
      .limit(10);

    const optimizeFor: string[] = [];
    const avoid: string[] = [];
    for (const i of insights || []) {
      if (["winning_angle", "winning_platform", "top_post_explanation"].includes(i.insight_type)) {
        optimizeFor.push(i.insight_text);
      } else if (["weak_cta", "weak_theme", "quality_issue"].includes(i.insight_type)) {
        avoid.push(i.insight_text);
      }
    }
    return { optimizeFor: optimizeFor.slice(0, 4), avoid: avoid.slice(0, 3) };
  } catch (err) {
    console.error("[generate-content] insight fetch failed:", err);
    return { optimizeFor: [], avoid: [] };
  }
}

const PLATFORM_DIRECTIVES: Record<string, string> = {
  linkedin: `## LinkedIn Post Structure (MANDATORY)
Every LinkedIn post MUST follow this exact structure:

**HOOK** (lines 1–2): A bold, contrarian, or surprising opening that stops the scroll.
- Pattern interrupts: "Most companies don't have a strategy problem."
- Contrarian takes: "Dashboards don't drive decisions."
- Questions that provoke: "When was the last time your team actually tracked execution?"

**INSIGHT** (lines 3–6): Frame the problem clearly with tension.
- Use short, punchy lines (1 sentence per line)
- Create a rhythm: statement → evidence → consequence

**VALUE** (lines 7–12): Deliver the transformation or system.
- Use → arrows for process flows
- Be specific, not generic ("tracks decisions in real time" not "improves efficiency")

**AUTHORITY** (lines 13–14): Why this matters NOW.
- Reference a trend, shift, or urgency

**CTA** (last 2–3 lines): End with a question or clear next step.
- "What's your take?" or "Where does execution break down in your team?"

**FORMATTING RULES:**
- Use line breaks between every 1–2 sentences (mobile-first)
- Use "---" as section dividers
- Max 3 emojis total (professional, not decorative)
- 3–5 industry-specific hashtags on final line
- Tone: executive, authoritative, insight-driven
- Length: 150–300 words
- NEVER sound like a product brochure or marketing copy
- Write like a founder sharing hard-won insight`,

  x: `## X (Twitter) Post Structure (MANDATORY)
Every X post MUST follow these rules:

**FORMAT:**
- Max 280 characters (including hashtags)
- One core idea per tweet — no multi-topic threads
- Front-load the insight in the first 8 words

**TONE:**
- Punchy, direct, high signal density
- Write like a sharp founder, not a marketer
- Contrarian or surprising angles perform best
- No filler words, no corporate-speak

**STRUCTURE OPTIONS (pick one):**
1. Bold claim → one-line proof → hashtags
2. Question that provokes → answer → hashtags
3. "Most people think X. Reality: Y." → hashtags
4. Short stat or observation → sharp take → hashtags

**RULES:**
- 2–3 relevant hashtags max
- Zero or 1 emoji (never decorative)
- No "🚀" or "💡" — those signal AI content
- Must be retweetable on its own
- Every word must earn its place`,

  instagram: `## Instagram Post Structure
- Visual-first: the caption supports the image
- Use 2–3 relevant emojis (not spam)
- Hook in first line (shown before "more")
- Short paragraphs with line breaks
- 5–8 hashtags (mix popular + niche)
- End with engagement CTA ("save this", "tag someone")
- Tone: authentic, relatable, value-driven`,

  facebook: `## Facebook Post Structure
- Conversational, community-focused tone
- Hook in first 2 lines (shown before "see more")
- Tell a mini-story or share an observation
- 3–5 hashtags
- End with a question to drive comments
- Tone: warm, approachable, human`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      app,
      postsPerPlatform = 2,
      topic,
      persona_id,
      journey_stage,
      messaging_angle,
    } = await req.json() as {
      app: AppDetails;
      postsPerPlatform?: number;
      topic?: string;
      persona_id?: string;
      journey_stage?: string;
      messaging_angle?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Load persona + journey stage from DB if provided
    let persona: any = null;
    let stage: any = null;
    if (persona_id || (journey_stage && app.id)) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        if (persona_id) {
          const { data } = await sb.from("personas").select("*").eq("id", persona_id).maybeSingle();
          persona = data;
        }
        if (journey_stage && app.id) {
          const { data } = await sb.from("journey_stages").select("*")
            .eq("app_id", app.id).eq("stage", journey_stage).maybeSingle();
          stage = data;
        }
      } catch (e) {
        console.error("[generate-content] strategy fetch failed:", e);
      }
    }

    const strategyBlock = (() => {
      const parts: string[] = [];
      if (persona) {
        parts.push(`## TARGET PERSONA (write FOR this person specifically)
- Title: ${persona.title}${persona.company_size ? ` at ${persona.company_size}` : ""}
- Their pains: ${(persona.pains || []).join("; ") || "(none specified)"}
- Their goals: ${(persona.goals || []).join("; ") || "(none specified)"}
- Their buying triggers: ${(persona.triggers || []).join("; ") || "(none)"}
- Their objections: ${(persona.objections || []).join("; ") || "(none)"}
- Content style they prefer: ${persona.content_style || "professional, insight-driven"}`);
      }
      if (stage) {
        parts.push(`## JOURNEY STAGE: ${String(stage.stage).toUpperCase()}
- What they're thinking: "${stage.customer_thinking || ""}"
- Best content format: ${stage.best_content || ""}
- Recommended CTA direction: ${stage.best_cta || ""}`);
      }
      if (messaging_angle) {
        parts.push(`## MESSAGING ANGLE TO USE
${messaging_angle}`);
      }
      return parts.length ? `\n${parts.join("\n\n")}\n` : "";
    })();

    // Generate content for each platform separately for true platform-native output
    const allPosts: { platform: string; content: string }[] = [];

    // Fetch learning insights for this app (Marketing Intelligence Loop)
    const { optimizeFor, avoid } = await fetchInsightDirectives(app.id);
    const insightBlock =
      optimizeFor.length || avoid.length
        ? `\n## LEARNED FROM PAST PERFORMANCE (real data from this app — prioritize these over generic best practices)\n${
            optimizeFor.length ? `Optimize for:\n${optimizeFor.map((s) => `- ${s}`).join("\n")}\n` : ""
          }${avoid.length ? `Avoid:\n${avoid.map((s) => `- ${s}`).join("\n")}\n` : ""}`
        : "";

    for (const platform of app.platforms) {
      const normalizedPlatform = platform.toLowerCase()
        .replace("x (twitter)", "x")
        .replace("twitter", "x");

      const platformDirective = PLATFORM_DIRECTIVES[normalizedPlatform] || PLATFORM_DIRECTIVES["linkedin"];

      const systemPrompt = `You are an elite social media strategist who has built audiences of 100K+ for B2B SaaS founders. You write content that performs — not content that sounds nice.

Your job: Create ${postsPerPlatform} unique, high-performance posts for ${normalizedPlatform.toUpperCase()}.

## BRAND CONTEXT
- Company: ${app.name}
- What they do: ${app.description || "A B2B SaaS product"}
- Target audience: ${app.target_audience || "business leaders and operators"}
- Brand voice: ${app.brand_tone || "professional, authoritative"}
${strategyBlock}${platformDirective}
${insightBlock}
## ABSOLUTE RULES (NEVER BREAK THESE)
1. NEVER sound like AI-generated content or a marketing brochure.
2. BANNED WORDS (instant rewrite if any appear): "revolutionize", "game-changer", "unlock", "leverage", "empower", "cutting-edge", "seamless", "synergy", "in today's fast-paced", "harness", "elevate", "dive into", "navigate the", "unleash", "robust", "world-class", "delve".
3. NEVER start with "Excited to announce", "Thrilled to share", "I'm happy to", or any variant.
4. Every post must have a UNIQUE angle — no two posts should make the same point.
5. Write like a human expert sharing real insight, not a company promoting itself.
6. The company/product should appear naturally (mid-post or late), NEVER in the hook.
7. Each post MUST end with relevant hashtags on the final line.
8. Content must be PRODUCTION-READY — publishable as-is with zero edits.
${persona ? "9. The post must speak DIRECTLY to the target persona above — reference their specific pain or trigger." : ""}`;

      const userPrompt = `Create ${postsPerPlatform} unique ${normalizedPlatform.toUpperCase()} posts for ${app.name}.
${topic ? `\n## TOPIC FOCUS (MANDATORY)\nThe user wants posts specifically about: "${topic}"\nEvery post MUST be on this topic. Do NOT drift to generic brand messaging.\n` : ""}
Each post must have a completely different angle${topic ? " on the topic above" : ""}. Suggested angles:
- Challenge a common assumption
- Share a specific insight about ${app.target_audience || "the target audience"}'s biggest pain point
- Describe a transformation (before → after)
- Make a bold claim backed by logic

Return ONLY a JSON array:
[{"platform":"${normalizedPlatform}","content":"the full post text including hashtags"}]

No markdown, no code blocks, no explanations. Just the JSON array.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.8,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await response.text();
        console.error(`AI gateway error for ${normalizedPlatform}:`, response.status, errorText);
        throw new Error(`Failed to generate ${normalizedPlatform} content`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error(`No content generated for ${normalizedPlatform}`);
        continue;
      }

      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const posts = JSON.parse(jsonMatch[0]);
          // Hard safeguard: X has a 280 char limit. Even with a strong directive,
          // Gemini occasionally overshoots and the post then fails at publish time.
          // Trim to 270 to leave a small safety margin.
          for (const p of posts) {
            if (
              normalizedPlatform === "x" &&
              typeof p?.content === "string" &&
              p.content.length > 270
            ) {
              p.content = p.content.slice(0, 267).trimEnd() + "…";
            }
          }
          allPosts.push(...posts);
        }
      } catch (parseError) {
        console.error(`Parse error for ${normalizedPlatform}:`, parseError, "Content:", content);
      }

      // Small delay between platform calls to avoid rate limits
      if (app.platforms.indexOf(platform) < app.platforms.length - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (allPosts.length === 0) {
      throw new Error("Failed to generate any content");
    }

    return new Response(JSON.stringify({ posts: allPosts }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating content:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
