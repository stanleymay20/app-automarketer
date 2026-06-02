import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLATFORM_DIRECTIVES: Record<string, string> = {
  linkedin: `## LinkedIn Post Structure (MANDATORY)
Every LinkedIn post MUST follow this exact structure:

**HOOK** (lines 1–2): A bold, contrarian, or surprising opening that stops the scroll.
- Pattern interrupts: "Most companies don't have a strategy problem."
- Contrarian takes: "Dashboards don't drive decisions."

**INSIGHT** (lines 3–6): Frame the problem clearly with tension.
- Use short, punchy lines (1 sentence per line)

**VALUE** (lines 7–12): Deliver the transformation or system.
- Use → arrows for process flows
- Be specific, not generic

**CTA** (last 2–3 lines): End with a question or clear next step.

**FORMATTING RULES:**
- Use line breaks between every 1–2 sentences (mobile-first)
- Max 3 emojis total (professional, not decorative)
- 3–5 industry-specific hashtags on final line
- Tone: executive, authoritative, insight-driven
- Length: 150–300 words
- NEVER sound like a product brochure
- Write like a founder sharing hard-won insight`,

  x: `## X (Twitter) Post Structure (MANDATORY)
Every X post MUST follow these rules:

**FORMAT:**
- Max 270 characters (including hashtags) — leave a safety margin under 280
- One core idea per tweet
- Front-load the insight in the first 8 words

**TONE:**
- Punchy, direct, high signal density
- Write like a sharp founder, not a marketer
- Contrarian or surprising angles perform best

**RULES:**
- 2–3 relevant hashtags max
- Zero or 1 emoji (never decorative)
- No "🚀" or "💡"
- Every word must earn its place`,
};

interface AppRow {
  id: string;
  name: string;
  description: string | null;
  target_audience: string | null;
  brand_tone: string | null;
  platforms: string[] | null;
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("[AutoGenerate] Starting auto-generation run...");

    // Find all users with autopilot_mode enabled
    const { data: autopilotUsers, error: usersError } = await supabase
      .from("user_settings")
      .select("user_id, plan, posts_this_month")
      .eq("autopilot_mode", true);

    if (usersError) throw usersError;

    if (!autopilotUsers || autopilotUsers.length === 0) {
      console.log("[AutoGenerate] No autopilot users found");
      return new Response(JSON.stringify({ message: "No autopilot users", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[AutoGenerate] Found ${autopilotUsers.length} autopilot user(s)`);

    // Plan limits
    const PLAN_LIMITS: Record<string, number> = {
      free: 20,
      starter: 50,
      pro: 200,
      enterprise: 999999,
    };

    let totalGenerated = 0;
    const errors: { userId: string; error: string }[] = [];

    for (const userSettings of autopilotUsers) {
      const userId = userSettings.user_id;
      const postsLimit = PLAN_LIMITS[userSettings.plan] || 20;
      const postsUsed = userSettings.posts_this_month || 0;

      if (postsUsed >= postsLimit) {
        console.log(`[AutoGenerate] User ${userId} at plan limit (${postsUsed}/${postsLimit}), skipping`);
        continue;
      }

      // Get user's apps
      const { data: apps, error: appsError } = await supabase
        .from("apps")
        .select("id, name, description, target_audience, brand_tone, platforms")
        .eq("user_id", userId);

      if (appsError || !apps || apps.length === 0) {
        console.log(`[AutoGenerate] No apps for user ${userId}, skipping`);
        continue;
      }

      // Check if user already has pending/approved content scheduled in the next 3 days
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: upcomingContent } = await supabase
        .from("content")
        .select("id")
        .eq("user_id", userId)
        .in("status", ["pending", "approved"])
        .lt("scheduled_for", threeDaysFromNow)
        .gt("scheduled_for", new Date().toISOString());

      if (upcomingContent && upcomingContent.length >= 4) {
        console.log(`[AutoGenerate] User ${userId} already has ${upcomingContent.length} upcoming posts, skipping`);
        continue;
      }

      // Generate for each app (1 post per platform per run to stay conservative)
      for (const app of apps) {
        if (!app.platforms || app.platforms.length === 0) continue;

        // Check remaining budget
        const remaining = postsLimit - postsUsed - totalGenerated;
        if (remaining <= 0) break;

        try {
          const insightDirectives = await fetchInsightDirectives(supabase, app.id);
          const posts = await generateForApp(app as AppRow, LOVABLE_API_KEY, 1, insightDirectives);

          if (posts.length === 0) continue;

          // Insert with approved status and scheduled times
          const now = new Date();
          const contentToInsert = posts.map((post, index) => {
            // Schedule 6-12 hours from now, spread out
            const hoursAhead = 6 + index * 3;
            const scheduledTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

            return {
              app_id: app.id,
              user_id: userId,
              platform: post.platform,
              content_text: post.content,
              status: "approved",
              scheduled_for: scheduledTime.toISOString(),
            };
          });

          const { data: inserted, error: insertError } = await supabase
            .from("content")
            .insert(contentToInsert)
            .select();

          if (insertError) {
            console.error(`[AutoGenerate] Insert error for app ${app.id}:`, insertError);
            errors.push({ userId, error: insertError.message });
            continue;
          }

          totalGenerated += (inserted?.length || 0);

          // Fire quality gate + image generation for each post
          for (const item of inserted || []) {
            fetch(`${supabaseUrl}/functions/v1/quality-gate`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                content_id: item.id,
                content_text: item.content_text,
                platform: item.platform,
                app_id: item.app_id,
                user_id: userId,
              }),
            }).catch((err) => console.error("[AutoGenerate] Quality gate error:", err));

            fetch(`${supabaseUrl}/functions/v1/generate-post-image`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${serviceKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contentId: item.id,
                contentText: item.content_text,
                appName: app.name,
                platform: item.platform,
              }),
            }).catch((err) => console.error("[AutoGenerate] Image gen error:", err));
          }

          // Update posts_this_month
          await supabase
            .from("user_settings")
            .update({ posts_this_month: postsUsed + totalGenerated })
            .eq("user_id", userId);

          // Update app posts count
          await supabase
            .from("apps")
            .update({ posts_count: (app as any).posts_count + (inserted?.length || 0) })
            .eq("id", app.id);

          console.log(`[AutoGenerate] Generated ${inserted?.length || 0} posts for app "${app.name}" (user ${userId})`);
        } catch (err) {
          console.error(`[AutoGenerate] Error generating for app ${app.id}:`, err);
          errors.push({ userId, error: err instanceof Error ? err.message : String(err) });
        }
      }
    }

    console.log(`[AutoGenerate] Run complete. Generated: ${totalGenerated}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({ generated: totalGenerated, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[AutoGenerate] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchInsightDirectives(
  supabase: ReturnType<typeof createClient>,
  appId: string
): Promise<{ optimizeFor: string[]; avoid: string[] }> {
  try {
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
  } catch (e) {
    console.error("[AutoGenerate] insight fetch failed:", e);
    return { optimizeFor: [], avoid: [] };
  }
}

async function generateForApp(
  app: AppRow,
  apiKey: string,
  postsPerPlatform: number,
  directives: { optimizeFor: string[]; avoid: string[] } = { optimizeFor: [], avoid: [] }
): Promise<{ platform: string; content: string }[]> {
  const allPosts: { platform: string; content: string }[] = [];

  for (const platform of app.platforms || []) {
    const normalizedPlatform = platform.toLowerCase()
      .replace("x (twitter)", "x")
      .replace("twitter", "x");

    const platformDirective = PLATFORM_DIRECTIVES[normalizedPlatform] || PLATFORM_DIRECTIVES["linkedin"];

    const systemPrompt = `You are an elite social media strategist who has built audiences of 100K+ for B2B SaaS founders. You write content that performs.

## BRAND CONTEXT
- Company: ${app.name}
- What they do: ${app.description || "A B2B SaaS product"}
- Target audience: ${app.target_audience || "business leaders and operators"}
- Brand voice: ${app.brand_tone || "professional, authoritative"}

${platformDirective}
${
  directives.optimizeFor.length || directives.avoid.length
    ? `\n## LEARNED FROM PAST PERFORMANCE (real data from this app)\n${
        directives.optimizeFor.length
          ? `Optimize for:\n${directives.optimizeFor.map((s) => `- ${s}`).join("\n")}\n`
          : ""
      }${
        directives.avoid.length
          ? `Avoid:\n${directives.avoid.map((s) => `- ${s}`).join("\n")}\n`
          : ""
      }`
    : ""
}
## ABSOLUTE RULES
1. NEVER sound like AI-generated content or a marketing brochure
2. NEVER use: "revolutionize", "game-changer", "unlock", "leverage", "empower", "cutting-edge", "seamless"
3. NEVER start with "Excited to announce" or "Thrilled to share"
4. Every post must have a UNIQUE angle
5. Write like a human expert sharing real insight
6. The company/product should appear naturally, NEVER in the hook
7. Each post MUST end with relevant hashtags
8. Content must be PRODUCTION-READY — publishable as-is`;

    const userPrompt = `Create ${postsPerPlatform} unique ${normalizedPlatform.toUpperCase()} post(s) for ${app.name}.

Use a fresh, unique angle each time. Avoid repeating topics from recent posts.

Return ONLY a JSON array:
[{"platform":"${normalizedPlatform}","content":"the full post text including hashtags"}]

No markdown, no code blocks, no explanations. Just the JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AutoGenerate] AI error for ${normalizedPlatform}:`, response.status, errorText);
      continue;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) continue;

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const posts = JSON.parse(jsonMatch[0]);
        // Fix 2: X has a hard 280-char limit. Trim to 270 with ellipsis so the
        // failure never enters the publish queue (mirrors generate-content).
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
      console.error(`[AutoGenerate] Parse error for ${normalizedPlatform}:`, parseError);
    }

    // Small delay between platform calls
    await new Promise((r) => setTimeout(r, 500));
  }

  return allPosts;
}
