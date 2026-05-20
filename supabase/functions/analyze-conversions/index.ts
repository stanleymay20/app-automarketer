import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Conversion learning engine.
// Aggregates clicks/leads/conversions across content by persona, angle, stage, platform, hook
// and writes plain-English insights to learning_insights.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const app_id: string | undefined = body?.app_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve user (allow cron without auth — then iterate all apps with recent activity)
    const authHeader = req.headers.get("Authorization") || "";
    let userIds: string[] = [];
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await userClient.auth.getUser();
      if (user) userIds = [user.id];
    }

    // Find apps to analyze
    let appsQuery = supabase.from("apps").select("id, user_id, name");
    if (app_id) appsQuery = appsQuery.eq("id", app_id);
    else if (userIds.length) appsQuery = appsQuery.in("user_id", userIds);
    const { data: apps } = await appsQuery;
    if (!apps?.length) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let inserted = 0;

    for (const app of apps) {
      // Pull content with attribution fields
      const { data: content } = await supabase
        .from("content")
        .select("id, platform, persona_id, journey_stage, messaging_angle, content_text, clicks, impressions, engagements, status")
        .eq("app_id", app.id)
        .eq("user_id", app.user_id);

      if (!content?.length) continue;

      const ids = content.map((c) => c.id);

      // Lead & conversion counts per content
      const { data: leads } = await supabase
        .from("leads").select("source_content_id")
        .in("source_content_id", ids);
      const { data: conversions } = await supabase
        .from("conversions").select("source_content_id, amount")
        .in("source_content_id", ids);

      const leadsByContent = new Map<string, number>();
      leads?.forEach((l) => {
        if (!l.source_content_id) return;
        leadsByContent.set(l.source_content_id, (leadsByContent.get(l.source_content_id) || 0) + 1);
      });
      const convByContent = new Map<string, { count: number; amount: number }>();
      conversions?.forEach((c) => {
        if (!c.source_content_id) return;
        const cur = convByContent.get(c.source_content_id) || { count: 0, amount: 0 };
        cur.count += 1;
        cur.amount += Number(c.amount) || 0;
        convByContent.set(c.source_content_id, cur);
      });

      // Personas map for nicer names
      const personaIds = Array.from(new Set(content.map((c) => c.persona_id).filter(Boolean))) as string[];
      const { data: personas } = personaIds.length
        ? await supabase.from("personas").select("id, title").in("id", personaIds)
        : { data: [] as any[] };
      const personaName = (id: string | null) =>
        personas?.find((p: any) => p.id === id)?.title || "Unknown persona";

      type Bucket = { clicks: number; impressions: number; leads: number; conversions: number; revenue: number; count: number };
      const newBucket = (): Bucket => ({ clicks: 0, impressions: 0, leads: 0, conversions: 0, revenue: 0, count: 0 });
      const add = (m: Map<string, Bucket>, key: string, c: typeof content[0]) => {
        if (!key) return;
        const b = m.get(key) || newBucket();
        b.clicks += c.clicks || 0;
        b.impressions += c.impressions || 0;
        b.count += 1;
        const lc = leadsByContent.get(c.id) || 0;
        const cv = convByContent.get(c.id);
        b.leads += lc;
        b.conversions += cv?.count || 0;
        b.revenue += cv?.amount || 0;
        m.set(key, b);
      };

      const byPersona = new Map<string, Bucket>();
      const byAngle = new Map<string, Bucket>();
      const byStage = new Map<string, Bucket>();
      const byPlatform = new Map<string, Bucket>();
      const byHook = new Map<string, Bucket>();

      const hookOf = (text: string) => {
        const first = (text || "").split(/\n|[.!?]/)[0].trim();
        if (first.length < 8) return "";
        if (first.endsWith("?")) return "question";
        if (/^\d/.test(first)) return "number-led";
        if (/^(stop|don't|never|forget)/i.test(first)) return "contrarian";
        if (/^(here'?s|the truth|imagine|what if)/i.test(first)) return "story";
        if (/^(how|why|when)/i.test(first)) return "explainer";
        return "statement";
      };

      content.forEach((c) => {
        if (c.persona_id) add(byPersona, c.persona_id, c);
        if (c.messaging_angle) add(byAngle, c.messaging_angle, c);
        if (c.journey_stage) add(byStage, c.journey_stage, c);
        if (c.platform) add(byPlatform, c.platform.toLowerCase(), c);
        const h = hookOf(c.content_text);
        if (h) add(byHook, h, c);
      });

      const score = (b: Bucket) => (b.conversions * 10) + (b.leads * 3) + (b.clicks * 0.5);
      const topOf = (m: Map<string, Bucket>, minCount = 2) => {
        const arr = Array.from(m.entries()).filter(([, b]) => b.count >= minCount);
        arr.sort((a, b) => score(b[1]) - score(a[1]));
        return arr;
      };

      const insights: { type: string; text: string; platform: string | null; confidence: number }[] = [];

      const topPersona = topOf(byPersona)[0];
      if (topPersona && topPersona[1].leads + topPersona[1].conversions > 0) {
        const [pid, b] = topPersona;
        insights.push({
          type: "top_persona",
          platform: null,
          text: `${personaName(pid)} is your strongest persona — ${b.leads} lead${b.leads === 1 ? "" : "s"} and ${b.conversions} conversion${b.conversions === 1 ? "" : "s"} from ${b.count} posts.`,
          confidence: Math.min(0.95, 0.5 + b.count * 0.05),
        });
      }

      const topAngle = topOf(byAngle)[0];
      if (topAngle && topAngle[1].clicks > 0) {
        const [name, b] = topAngle;
        insights.push({
          type: "top_angle",
          platform: null,
          text: `The "${name}" angle is outperforming — ${b.clicks} clicks and ${b.leads} leads across ${b.count} posts. Use it more often.`,
          confidence: Math.min(0.9, 0.45 + b.count * 0.05),
        });
      }

      const topStage = topOf(byStage)[0];
      if (topStage && topStage[1].leads > 0) {
        const [name, b] = topStage;
        insights.push({
          type: "top_stage",
          platform: null,
          text: `Posts targeting the "${name}" stage convert best — ${b.leads} leads from ${b.count} posts. Double down here.`,
          confidence: Math.min(0.9, 0.45 + b.count * 0.05),
        });
      }

      const platforms = topOf(byPlatform, 1);
      if (platforms.length >= 2) {
        const [a, b] = platforms;
        const ratio = score(b[1]) > 0 ? score(a[1]) / score(b[1]) : 0;
        if (ratio >= 1.3) {
          insights.push({
            type: "platform_fit",
            platform: a[0],
            text: `${a[0].toUpperCase()} is converting ${ratio.toFixed(1)}x better than ${b[0].toUpperCase()}. Shift budget toward ${a[0]}.`,
            confidence: Math.min(0.9, 0.5 + (a[1].count + b[1].count) * 0.03),
          });
        }
      } else if (platforms.length === 1 && platforms[0][1].clicks > 5) {
        insights.push({
          type: "platform_fit",
          platform: platforms[0][0],
          text: `${platforms[0][0].toUpperCase()} is your only producing channel so far. Test a second channel to compare.`,
          confidence: 0.6,
        });
      }

      const topHook = topOf(byHook, 2)[0];
      if (topHook && topHook[1].clicks > 0) {
        const [name, b] = topHook;
        const labels: Record<string, string> = {
          question: "Question-led hooks",
          "number-led": "Number-led hooks",
          contrarian: "Contrarian hooks",
          story: "Story hooks",
          explainer: "Explainer hooks",
          statement: "Direct-statement hooks",
        };
        insights.push({
          type: "top_hook",
          platform: null,
          text: `${labels[name] || name} drive the most clicks for you (${b.clicks} clicks, ${b.count} posts). Start more posts this way.`,
          confidence: Math.min(0.85, 0.4 + b.count * 0.05),
        });
      }

      // CTA recommendation based on conversion rate per content
      const withConv = content.filter((c) => (convByContent.get(c.id)?.count || 0) > 0);
      if (withConv.length >= 2) {
        insights.push({
          type: "cta_recommendation",
          platform: null,
          text: `Your converting posts share a clear ask. Make every post end with a one-line CTA pointing to your landing page.`,
          confidence: 0.7,
        });
      } else if (content.length >= 5 && (leads?.length || 0) === 0) {
        insights.push({
          type: "cta_recommendation",
          platform: null,
          text: `Posts are getting impressions but no leads. Add a stronger CTA — one outcome, one link, no hedging.`,
          confidence: 0.75,
        });
      }

      // Landing page intelligence
      const totalClicks = content.reduce((s, c) => s + (c.clicks || 0), 0);
      const totalLeads = leads?.length || 0;
      if (totalClicks >= 20) {
        const rate = totalLeads / totalClicks;
        if (rate < 0.05) {
          insights.push({
            type: "landing_optimization",
            platform: null,
            text: `Landing page conversion is ${(rate * 100).toFixed(1)}% (${totalLeads}/${totalClicks}). Regenerate copy for your top persona — your offer isn't matching their pain.`,
            confidence: 0.8,
          });
        } else if (rate >= 0.15) {
          insights.push({
            type: "landing_optimization",
            platform: null,
            text: `Landing page is converting ${(rate * 100).toFixed(0)}% of clicks — strong. Drive more traffic, don't change the copy.`,
            confidence: 0.85,
          });
        }
      }

      if (insights.length === 0) {
        processed += 1;
        continue;
      }

      // Replace previous insights of these types for this app
      const types = Array.from(new Set(insights.map((i) => i.type)));
      await supabase.from("learning_insights")
        .delete()
        .eq("app_id", app.id)
        .eq("user_id", app.user_id)
        .in("insight_type", types);

      const rows = insights.map((i) => ({
        app_id: app.id,
        user_id: app.user_id,
        insight_type: i.type,
        insight_text: i.text,
        platform: i.platform,
        confidence: i.confidence,
      }));
      const { error: insErr } = await supabase.from("learning_insights").insert(rows);
      if (!insErr) inserted += rows.length;

      processed += 1;
    }

    return new Response(JSON.stringify({ ok: true, processed, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyze-conversions error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
