import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;
const MAX_QUALITY_ATTEMPTS = 2; // generate + 1 regen if quality fails

type VisualMode = "product_ui" | "insight" | "minimal_authority" | "narrative";

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429 || attempt === retries) return response;
    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
    console.warn(`[generate-post-image] 429, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error("unreachable");
}

/* ---------------- Brand system ---------------- */
const BRAND = {
  navy: "#0B1B2B",
  deepNavy: "#0F172A",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  white: "#FFFFFF",
  offWhite: "#F8FAFC",
  amber: "#F59E0B",
  font: "Inter, SF Pro Display, system-ui",
};

/* ---------------- Headline extraction ---------------- */
function extractHeadline(contentText: string, appName: string): string {
  const lines = contentText.split("\n").map((l) => l.trim()).filter(Boolean);
  const firstLine = lines[0] || "";
  if (firstLine.length <= 60 && firstLine.length > 5) {
    return firstLine.replace(/[#@*_`]/g, "").trim();
  }
  const candidates = [
    firstLine.match(/(.{5,55}[≠→=].{3,30})/)?.[1],
    firstLine.match(/"([^"]{5,55})"/)?.[1],
    firstLine.split(/[.!?]/)[0]?.trim(),
  ].filter(Boolean) as string[];
  const headline = candidates[0] || appName || "Built for builders";
  return headline.length > 55 ? headline.substring(0, 52) + "…" : headline;
}

/* ---------------- Audience inference ---------------- */
function inferAudience(targetAudience?: string | null, platform?: string): string {
  if (targetAudience && targetAudience.trim().length > 2) return targetAudience.trim();
  if ((platform || "").toLowerCase() === "linkedin") return "B2B founders and SaaS executives";
  return "indie builders and growth-minded operators";
}

/* ---------------- Visual mode picker ---------------- */
function pickVisualMode(contentText: string, requested?: string): VisualMode {
  const valid: VisualMode[] = ["product_ui", "insight", "minimal_authority", "narrative"];
  if (requested && valid.includes(requested as VisualMode)) return requested as VisualMode;

  const t = contentText.toLowerCase();
  // Comparison / before-after / problem-solution → insight mode
  if (/\b(vs\.?|versus|before|after|→|problem|solution|instead of)\b/.test(t)) return "insight";
  // Strong one-liner / bold claim → minimal authority
  if (contentText.split("\n")[0]?.length <= 70 && contentText.length < 240) return "minimal_authority";
  // Story / journey / pain → narrative
  if (/\b(struggle|burned out|chaos|founder|spent (weeks|months)|story|journey)\b/.test(t)) return "narrative";
  // Default → product UI
  return "product_ui";
}

/* ---------------- Prompt templates per mode ---------------- */
function buildImagePrompt(opts: {
  mode: VisualMode;
  headline: string;
  coreMessage: string;
  audience: string;
  appName: string;
  platform: string;
}): string {
  const { mode, headline, coreMessage, audience, appName, platform } = opts;
  const dims = platform === "x"
    ? "1200x675 (16:9), Twitter/X feed"
    : "1200x627, LinkedIn feed";

  const brandFooter = `Tiny, understated wordmark "${appName}" in the bottom-right in ${BRAND.offWhite} at 50% opacity. No watermark spam, no logos repeated.`;
  const palette = `Strict color palette ONLY: deep navy ${BRAND.deepNavy}, dark slate, teal ${BRAND.teal}, cyan ${BRAND.cyan}, white ${BRAND.white}, off-white ${BRAND.offWhite}. Optional single amber ${BRAND.amber} highlight. NO other colors.`;
  const ban = `STRICTLY FORBIDDEN: abstract circuits, glowing brains, generic AI gradients, random arrows flying around, neon swirls, stock photo people, cartoon mascots, clip art, 3D shiny spheres, particle dust, "AI" iconography clichés.`;
  const shared = `Format: ${dims}. ${palette} ${brandFooter} Typography: ${BRAND.font}, modern sans-serif, perfect kerning, real legible text. ${ban}`;

  switch (mode) {
    case "product_ui":
      return `Create a hyper-realistic SaaS product screenshot mockup for ${audience}.

CORE MESSAGE TO VISUALIZE: "${coreMessage}"
DASHBOARD HEADER (real text, prominent): "${headline}"

DESIGN: A real-looking enterprise SaaS dashboard UI. Dark theme (background ${BRAND.deepNavy}). Show a believable product interface with:
- A clean left sidebar with 4-5 nav items (real labels like Overview, Signals, Pipeline, Reports)
- A main panel with a real chart (line or bar) showing an upward trend in ${BRAND.teal}
- 3 KPI tiles with realistic numbers (e.g. "Pipeline +38%", "Lead score 82", "Response time 1.2h")
- ONE alert/notification banner with believable copy that ties to the headline (e.g. "Delay detected on stage 3" or "Anomaly in signup funnel")
- Subtle inner shadow on the window frame, traffic-light dots top-left

It must look like a real screenshot of a shipping product — not an illustration. Pixel-aligned UI, real typography, no gibberish text.

${shared}`;

    case "insight":
      return `Create a clean data-storytelling visual for ${audience}.

CORE MESSAGE TO VISUALIZE: "${coreMessage}"
HEADLINE (real text, top of image): "${headline}"

DESIGN: A side-by-side or before/after comparison composition.
- LEFT side labeled "Before" in muted slate, showing the broken/old state with a flat or declining mini-chart in dim gray
- RIGHT side labeled "After" in ${BRAND.teal}, showing the improved state with a clean rising chart in ${BRAND.teal}/${BRAND.cyan}
- Use simple geometric shapes, real numeric labels on axes (e.g. "Week 1 → Week 6"), and one short caption per side
- Background: deep navy ${BRAND.deepNavy} with very subtle grid (5% opacity)
- A thin vertical divider in ${BRAND.cyan} between the two sides
- No people, no decorative elements — just clear, editorial data viz like a Stripe or Linear blog hero

${shared}`;

    case "minimal_authority":
      return `Create a minimal authority statement graphic for ${audience}.

ONE BOLD MESSAGE, displayed huge and centered: "${headline}"

DESIGN:
- Background: solid ${BRAND.deepNavy} (no gradient, no patterns, no noise)
- Headline takes up 60-70% of the canvas, weight 800, tight letter-spacing, color ${BRAND.white}
- One single accent: a thin ${BRAND.teal} underline beneath the headline, or one word inside the headline highlighted in ${BRAND.teal}
- Massive negative space around the text
- Optional one-line subtitle under headline in ${BRAND.offWhite} 60% opacity, max 8 words, paraphrasing: "${coreMessage}"
- Editorial magazine cover energy. Think New York Times opinion piece meets Apple keynote slide.

${shared}`;

    case "narrative":
      return `Create a conceptual visual that shows the business problem behind: "${coreMessage}" for ${audience}.

HEADLINE (real text overlay): "${headline}"

DESIGN: A conceptual editorial illustration using ONLY geometric shapes, lines, and UI fragments — no people, no faces.
- Show "complexity / chaos" on one side (tangled lines, scattered UI cards in muted slate)
- Show "clarity / order" emerging on the other (aligned grid, single clean ${BRAND.teal} flow line)
- Background: deep navy ${BRAND.deepNavy}
- Composition should feel cinematic and editorial — like a Bloomberg or Economist illustration
- A single ${BRAND.teal} accent line connects the two states
- Headline overlaid top-left, anchored, in large bold ${BRAND.white}

${shared}`;
  }
}

/* ---------------- AI: extract core message + audience + mode ---------------- */
async function planVisual(opts: {
  contentText: string;
  appName: string;
  targetAudience?: string | null;
  brandTone?: string | null;
  platform: string;
  apiKey: string;
}): Promise<{ coreMessage: string; audience: string; mode: VisualMode; headline: string }> {
  const { contentText, appName, targetAudience, brandTone, platform, apiKey } = opts;
  const fallbackHeadline = extractHeadline(contentText, appName);
  const fallbackAudience = inferAudience(targetAudience, platform);
  const fallbackMode = pickVisualMode(contentText);

  try {
    const resp = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You analyze marketing posts and plan a visual. Return ONLY a tool call. Pick the BEST visual mode: product_ui (realistic SaaS dashboard with metrics/alerts), insight (before/after, problem→solution), minimal_authority (one bold statement), narrative (conceptual problem visualization).",
          },
          {
            role: "user",
            content: `Post:\n"""${contentText}"""\n\nApp: ${appName}\nAudience hint: ${targetAudience || "n/a"}\nBrand tone: ${brandTone || "n/a"}\nPlatform: ${platform}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "plan_visual",
              description: "Plan the visual for this post.",
              parameters: {
                type: "object",
                properties: {
                  core_message: { type: "string", description: "The single core idea of the post in <=18 words, plain English." },
                  audience: { type: "string", description: "Who this post speaks to in 3-6 words (e.g. 'B2B SaaS founders')." },
                  visual_mode: { type: "string", enum: ["product_ui", "insight", "minimal_authority", "narrative"] },
                  headline: { type: "string", description: "Punchy headline to render IN the image, max 55 chars." },
                },
                required: ["core_message", "audience", "visual_mode", "headline"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "plan_visual" } },
      }),
    });

    if (!resp.ok) throw new Error(`plan_visual ${resp.status}`);
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("no tool args");
    const parsed = JSON.parse(args);
    return {
      coreMessage: String(parsed.core_message || contentText.slice(0, 140)),
      audience: String(parsed.audience || fallbackAudience),
      mode: (parsed.visual_mode as VisualMode) || fallbackMode,
      headline: String(parsed.headline || fallbackHeadline).slice(0, 55),
    };
  } catch (e) {
    console.warn("[generate-post-image] planVisual fallback:", e instanceof Error ? e.message : e);
    return {
      coreMessage: contentText.slice(0, 140),
      audience: fallbackAudience,
      mode: fallbackMode,
      headline: fallbackHeadline,
    };
  }
}

/* ---------------- AI quality gate ---------------- */
async function qualityCheck(opts: {
  imageBase64: string;
  mimeType: string;
  headline: string;
  coreMessage: string;
  mode: VisualMode;
  apiKey: string;
}): Promise<{ pass: boolean; reason: string }> {
  const { imageBase64, mimeType, headline, coreMessage, mode, apiKey } = opts;
  try {
    const resp = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You QA marketing visuals. Reject if: looks generic AI, abstract circuits, glowing brains, random arrows, neon swirls, stock-photo people, low contrast, illegible text, off-message, off-brand colors. Approve only if it feels premium SaaS-grade and matches the message and the requested mode.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: `Mode: ${mode}\nHeadline that should appear: "${headline}"\nCore message: "${coreMessage}"\n\nIs this image acceptable?` },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "qa_verdict",
              parameters: {
                type: "object",
                properties: {
                  pass: { type: "boolean" },
                  reason: { type: "string", description: "<= 20 words" },
                },
                required: ["pass", "reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "qa_verdict" } },
      }),
    });
    if (!resp.ok) return { pass: true, reason: "qa-skipped" };
    const data = await resp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return { pass: true, reason: "qa-skipped" };
    const parsed = JSON.parse(args);
    return { pass: !!parsed.pass, reason: String(parsed.reason || "") };
  } catch (e) {
    console.warn("[generate-post-image] QA error, accepting:", e instanceof Error ? e.message : e);
    return { pass: true, reason: "qa-error" };
  }
}

/* ---------------- Image generation ---------------- */
async function generateImage(prompt: string, apiKey: string): Promise<{ base64: string; format: string }> {
  const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-pro-image-preview",
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw Object.assign(new Error("rate_limit"), { status: 429 });
    if (response.status === 402) throw Object.assign(new Error("credits"), { status: 402 });
    const errorText = await response.text();
    console.error("AI image generation error:", response.status, errorText);
    throw new Error(`AI image generation failed [${response.status}]`);
  }

  const data = await response.json();
  const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!imageData) {
    console.error("No image in AI response:", JSON.stringify(data).substring(0, 500));
    throw new Error("No image generated");
  }
  const m = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!m) throw new Error("Invalid image data format");
  return { format: m[1], base64: m[2] };
}

/* ---------------- Main ---------------- */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    const { contentId, contentText, appName, platform, visualMode, appId, topic } = await req.json();
    if (!contentId || !contentText) throw new Error("Missing contentId or contentText");

    // Anchor the planner on the user's chosen topic when present, so the image
    // headline and core message stay on-topic instead of drifting to the post's
    // hook line (which may be deliberately contrarian and off-subject).
    const planContext = topic && typeof topic === "string" && topic.trim().length > 0
      ? `User topic focus: "${topic.trim()}"\n\n${contentText}`
      : contentText;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Pull app context for audience + tone
    let targetAudience: string | null = null;
    let brandTone: string | null = null;
    let resolvedAppName = appName || "";
    if (appId) {
      const { data: app } = await supabase
        .from("apps")
        .select("name, target_audience, brand_tone")
        .eq("id", appId)
        .maybeSingle();
      if (app) {
        targetAudience = app.target_audience;
        brandTone = app.brand_tone;
        resolvedAppName = resolvedAppName || app.name;
      }
    }

    const normalizedPlatform = (platform || "linkedin").toLowerCase();

    // 1. Plan the visual (mode + audience + headline + core message)
    const plan = await planVisual({
      contentText: planContext,
      appName: resolvedAppName,
      targetAudience,
      brandTone,
      platform: normalizedPlatform,
      apiKey: LOVABLE_API_KEY,
    });
    // Allow caller-forced mode to override
    const finalMode = pickVisualMode(contentText, visualMode || plan.mode);

    console.log(`[generate-post-image] plan | mode=${finalMode} | audience="${plan.audience}" | headline="${plan.headline}"`);

    // 2. Generate + QA loop
    let chosen: { base64: string; format: string } | null = null;
    let lastReason = "";
    for (let attempt = 1; attempt <= MAX_QUALITY_ATTEMPTS; attempt++) {
      const prompt = buildImagePrompt({
        mode: finalMode,
        headline: plan.headline,
        coreMessage: plan.coreMessage,
        audience: plan.audience,
        appName: resolvedAppName || "ScrollMarketer",
        platform: normalizedPlatform,
      });

      try {
        const img = await generateImage(prompt, LOVABLE_API_KEY);
        const qa = await qualityCheck({
          imageBase64: img.base64,
          mimeType: `image/${img.format}`,
          headline: plan.headline,
          coreMessage: plan.coreMessage,
          mode: finalMode,
          apiKey: LOVABLE_API_KEY,
        });
        console.log(`[generate-post-image] attempt ${attempt} | qa.pass=${qa.pass} | reason="${qa.reason}"`);
        if (qa.pass || attempt === MAX_QUALITY_ATTEMPTS) {
          chosen = img;
          lastReason = qa.reason;
          break;
        }
        lastReason = qa.reason;
      } catch (err: any) {
        if (err?.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (err?.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add more credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (attempt === MAX_QUALITY_ATTEMPTS) throw err;
      }
    }
    if (!chosen) throw new Error("No image generated after retries");

    // 3. Upload
    const binaryString = atob(chosen.base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const fileName = `${user.id}/${contentId}.${chosen.format}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, bytes, { contentType: `image/${chosen.format}`, upsert: true });
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload image");
    }

    const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("content")
      .update({ image_url: imageUrl })
      .eq("id", contentId)
      .eq("user_id", user.id);
    if (updateError) {
      console.error("Content update error:", updateError);
      throw new Error("Failed to update content with image URL");
    }

    console.log(`[generate-post-image] ✓ content=${contentId} mode=${finalMode} qa="${lastReason}" url=${imageUrl}`);

    return new Response(
      JSON.stringify({
        imageUrl,
        headline: plan.headline,
        visualMode: finalMode,
        audience: plan.audience,
        qaReason: lastReason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating post image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
