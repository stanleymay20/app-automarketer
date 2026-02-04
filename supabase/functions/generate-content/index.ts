import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AppDetails {
  name: string;
  description: string | null;
  target_audience: string | null;
  brand_tone: string | null;
  platforms: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { app, postsPerPlatform = 2 } = await req.json() as { 
      app: AppDetails; 
      postsPerPlatform?: number;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a professional social media marketer. Your job is to create authentic, engaging marketing content for apps.

Rules:
- Write in a ${app.brand_tone || 'professional'} tone
- Target audience: ${app.target_audience || 'general audience'}
- Keep content natural and human - avoid buzzwords and excessive emojis
- Each post should have a clear call-to-action
- Adapt the writing style to each platform's culture
- Posts should be concise but impactful

Platform guidelines:
- X (Twitter): Max 280 characters, punchy and direct
- LinkedIn: Professional, value-focused, can be longer
- Instagram: Visual-friendly, use 2-3 relevant emojis, include hashtag suggestions
- Facebook: Conversational, community-focused
- Email: Subject line + brief teaser, professional`;

    const userPrompt = `Create ${postsPerPlatform} unique marketing posts for each of these platforms: ${app.platforms.join(', ')}.

App Name: ${app.name}
Description: ${app.description || 'A useful application'}

Return your response as a JSON array with this exact format:
[
  {
    "platform": "platform_name",
    "content": "the post content"
  }
]

Only return the JSON array, no additional text.`;

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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate content");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated");
    }

    // Parse the JSON response
    let posts;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        posts = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response");
      }
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      throw new Error("Failed to parse generated content");
    }

    return new Response(JSON.stringify({ posts }), {
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
