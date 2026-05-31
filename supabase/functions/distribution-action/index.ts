import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action =
  | "save" | "activate" | "dismiss" | "view"
  | "mark_contacted" | "mark_converted"
  | "generate_channel_campaign"
  | "generate_community_outreach"
  | "generate_influencer_outreach"
  | "generate_event_strategy";

async function aiText(system: string, user: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { target_id, action } = (await req.json()) as { target_id: string; action: Action };
    if (!target_id || !action) {
      return new Response(JSON.stringify({ error: "target_id and action required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: target, error: tErr } = await admin.from("distribution_targets").select("*").eq("id", target_id).eq("user_id", user.id).maybeSingle();
    if (tErr || !target) return new Response(JSON.stringify({ error: "Target not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const log = (extra: Record<string, any> = {}) =>
      admin.from("distribution_actions").insert({ user_id: user.id, target_id, action_type: action, ...extra });

    let result: any = { ok: true };

    if (action === "save") {
      await admin.from("distribution_targets").update({ status: "saved", saved_at: new Date().toISOString() }).eq("id", target_id);
      await log();
    } else if (action === "activate") {
      await admin.from("distribution_targets").update({ status: "active", activated_at: new Date().toISOString() }).eq("id", target_id);
      await log();
    } else if (action === "dismiss") {
      await admin.from("distribution_targets").update({ status: "dismissed" }).eq("id", target_id);
      await log();
    } else if (action === "view") {
      await log();
    } else if (action === "mark_contacted") {
      await admin.from("distribution_targets").update({ status: "contacted", contacted_at: new Date().toISOString() }).eq("id", target_id);
      await log();
    } else if (action === "mark_converted") {
      await admin.from("distribution_targets").update({ status: "converted", conversions_count: (target.conversions_count ?? 0) + 1 }).eq("id", target_id);
      await log();
    } else {
      // Generation actions — need product + persona context
      const [appRes, personasRes] = await Promise.all([
        target.app_id ? admin.from("apps").select("name, description, target_audience, website_url").eq("id", target.app_id).maybeSingle() : Promise.resolve({ data: null } as any),
        admin.from("personas").select("title, pains, channels").eq("user_id", user.id).limit(5),
      ]);

      const styles: Record<string, string> = {
        generate_channel_campaign: `A 7-day channel campaign brief for ${target.platform ?? "this channel"}. Include: angle, content cadence (per day), 3 hook examples that fit ${target.platform ?? "the channel"} native format, success metric. Plain bullet markdown, <250 words.`,
        generate_community_outreach: `A short value-first community outreach post for "${target.name}". Must follow community norms (no overt promotion). Open with a real observation/question, share something useful, mention the product only at the end as context. Under 150 words.`,
        generate_influencer_outreach: `A short DM/email to ${target.name}. Personal opener (something specific about their work), why our audience overlaps, concrete collab idea (podcast, guest post, co-marketing), low-friction ask. Under 110 words.`,
        generate_event_strategy: `An event playbook for "${target.name}"${target.event_date ? ` (${target.event_date})` : ""}. Cover: pre-event outreach, on-the-ground tactics, post-event follow-up. 3 bullets per phase, plain markdown.`,
      };

      const isEmail = action === "generate_influencer_outreach";
      const text = await aiText(
        "You write distribution strategy and outreach for an AI growth platform. Natural, human, simple. No buzzwords. Always concrete.",
        `${styles[action]}

PRODUCT: ${JSON.stringify(appRes.data ?? {})}
TARGET: ${target.name} — ${target.description ?? ""} (${target.target_type}/${target.platform ?? "n/a"}) ${target.url ?? ""}
RATIONALE: ${target.rationale ?? ""}
SIGNALS: ${JSON.stringify(target.signals ?? [])}
AUDIENCE: ${target.audience ?? ""}
PERSONAS: ${JSON.stringify(personasRes.data ?? [])}

Return plain text only. ${isEmail ? 'If channel is email, you may start with "Subject: ...".' : ""}`
      );

      let subject: string | null = null;
      let bodyText = text.trim();
      if (isEmail) {
        const m = bodyText.match(/^Subject:\s*(.+)$/im);
        if (m) { subject = m[1].trim(); bodyText = bodyText.replace(m[0], "").trim(); }
      }

      const actionTypeMap: Record<string, string> = {
        generate_channel_campaign: "channel_campaign",
        generate_community_outreach: "community_outreach",
        generate_influencer_outreach: "influencer_outreach",
        generate_event_strategy: "event_strategy",
      };

      const { data: act } = await admin.from("distribution_actions").insert({
        user_id: user.id,
        target_id,
        action_type: actionTypeMap[action],
        channel: target.platform ?? null,
        subject,
        body: bodyText,
      }).select().single();

      // also seed a campaign for channel_campaign
      if (action === "generate_channel_campaign") {
        const { data: campaign } = await admin.from("campaigns").insert({
          user_id: user.id,
          app_id: target.app_id,
          campaign_name: `${target.platform ?? target.name} distribution`,
          strategy_summary: bodyText.slice(0, 800),
          themes: target.signals ?? [],
          platform_mix: target.platform ? [target.platform] : [],
          posting_frequency: 3,
        }).select().single();
        if (campaign) {
          await admin.from("distribution_actions").update({ campaign_id: campaign.id }).eq("id", act!.id);
          result.campaign = campaign;
        }
      }

      result.action = act;
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("distribution-action", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
