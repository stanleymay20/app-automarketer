import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 2000;

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, options);
    if (response.status !== 429 || attempt === retries) return response;
    const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
    console.warn(`[generate-post-image] 429 hit, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error("unreachable");
}

/** Extract a short, punchy headline from the post content */
function extractHeadline(contentText: string, appName: string): string {
  // Look for a strong opening line (before first line break or period)
  const lines = contentText.split("\n").filter(l => l.trim());
  const firstLine = lines[0] || "";
  
  // If first line is short enough, use it as headline
  if (firstLine.length <= 50 && firstLine.length > 5) {
    return firstLine.replace(/[#@]/g, "").trim();
  }
  
  // Otherwise extract key phrase
  const phrases = [
    // Look for "X ≠ Y" or "X → Y" patterns
    firstLine.match(/(.{5,40}[≠→=].{5,30})/)?.[1],
    // Look for quoted text
    firstLine.match(/"([^"]{5,40})"/)?.[1],
    // First sentence if short
    firstLine.split(/[.!?]/)[0]?.trim(),
  ].filter(Boolean);
  
  const headline = phrases[0] || appName;
  return headline.length > 45 ? headline.substring(0, 42) + "..." : headline;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Unauthorized");

    const { contentId, contentText, appName, platform } = await req.json();
    if (!contentId || !contentText) throw new Error("Missing contentId or contentText");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const headline = extractHeadline(contentText, appName || "");
    const normalizedPlatform = (platform || "linkedin").toLowerCase();

    // Platform-specific dimensions and style
    const platformStyle = normalizedPlatform === "x" 
      ? "1200x675 aspect ratio, optimized for Twitter/X feed" 
      : "1200x627 aspect ratio, optimized for LinkedIn feed";

    const imagePrompt = `Create a premium, enterprise-grade social media graphic. This must look like it was designed by a professional agency for a top-tier SaaS company.

HEADLINE TEXT TO INCLUDE IN THE IMAGE: "${headline}"

DESIGN SPECIFICATIONS:
- Background: Deep navy (#0F172A) to dark slate (#1E293B) gradient, or clean white (#FAFAFA) to light gray (#F1F5F9)
- Typography: The headline "${headline}" must be prominently displayed in large, bold, modern sans-serif font (like Inter or SF Pro)
- Accent color: Electric blue (#3B82F6) or teal (#06B6D4) for highlights and emphasis
- Layout: Clean, minimalist with generous whitespace
- ${platformStyle}

VISUAL ELEMENTS (choose what fits the headline):
- Subtle geometric patterns or grid lines in the background
- Abstract data visualization elements (nodes, connections, flow lines)
- Clean iconography that reinforces the message
- Subtle gradient overlays for depth

MANDATORY RULES:
- The headline text MUST be legible and prominent
- NO stock photo style, NO cartoonish elements, NO clip art
- NO busy backgrounds or visual clutter
- ONE clear focal point: the headline
- Small subtle footer text: "${appName || "ScrollMarketer"}" in a thin, understated font at the bottom
- Professional, executive-level quality — think McKinsey, Stripe, or Linear design standards
- The overall feel should be: authoritative, modern, trustworthy`;

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: imagePrompt }],
        modalities: ["image", "text"],
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
      console.error("AI image generation error:", response.status, errorText);
      throw new Error(`AI image generation failed [${response.status}]`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in AI response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated");
    }

    // Extract base64 data
    const base64Match = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) throw new Error("Invalid image data format");

    const imageFormat = base64Match[1];
    const base64Content = base64Match[2];

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Upload to storage
    const fileName = `${user.id}/${contentId}.${imageFormat}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, bytes, {
        contentType: `image/${imageFormat}`,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload image");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Update content record with image URL
    const { error: updateError } = await supabase
      .from("content")
      .update({ image_url: imageUrl })
      .eq("id", contentId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Content update error:", updateError);
      throw new Error("Failed to update content with image URL");
    }

    console.log(`[generate-post-image] Success | content=${contentId} | headline="${headline}" | url=${imageUrl}`);

    return new Response(
      JSON.stringify({ imageUrl, headline }),
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
