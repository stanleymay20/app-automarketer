import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { app_id } = await req.json().catch(() => ({}));

    // Pull content, conversions, leads, personas
    const contentQ = supabase.from('content').select('id, persona_id, journey_stage, messaging_angle, platform, image_url, content_text').eq('user_id', user.id);
    if (app_id) contentQ.eq('app_id', app_id);
    const [{ data: content = [] }, { data: personas = [] }, { data: conversions = [] }, { data: leads = [] }] = await Promise.all([
      contentQ,
      supabase.from('personas').select('id, title').eq('user_id', user.id),
      supabase.from('conversions').select('amount, source_content_id, app_id').eq('user_id', user.id),
      supabase.from('leads').select('source_content_id, app_id').eq('user_id', user.id),
    ]);

    const filteredConv = app_id ? conversions.filter((c: any) => c.app_id === app_id) : conversions;
    const filteredLeads = app_id ? leads.filter((l: any) => l.app_id === app_id) : leads;

    // Map content -> persona
    const contentPersona = new Map<string, string | null>();
    content.forEach((c: any) => contentPersona.set(c.id, c.persona_id ?? null));

    // Aggregate revenue + leads per persona
    const personaMap = new Map<string, { id: string; title: string; content: number; revenue: number; leads: number; conversions: number }>();
    personas.forEach((p: any) => personaMap.set(p.id, { id: p.id, title: p.title, content: 0, revenue: 0, leads: 0, conversions: 0 }));
    const unassigned = { id: 'unassigned', title: 'Unassigned', content: 0, revenue: 0, leads: 0, conversions: 0 };

    content.forEach((c: any) => {
      const k = c.persona_id;
      if (k && personaMap.has(k)) personaMap.get(k)!.content++;
      else unassigned.content++;
    });
    filteredConv.forEach((c: any) => {
      const pid = contentPersona.get(c.source_content_id);
      const target = pid && personaMap.has(pid) ? personaMap.get(pid)! : unassigned;
      target.revenue += Number(c.amount || 0);
      target.conversions++;
    });
    filteredLeads.forEach((l: any) => {
      const pid = contentPersona.get(l.source_content_id);
      const target = pid && personaMap.has(pid) ? personaMap.get(pid)! : unassigned;
      target.leads++;
    });

    const totalContent = content.length || 1;
    const totalRevenue = [...personaMap.values()].reduce((s, p) => s + p.revenue, 0) + unassigned.revenue || 1;
    const totalLeads = [...personaMap.values()].reduce((s, p) => s + p.leads, 0) + unassigned.leads || 1;

    const revenueCoverage = [...personaMap.values(), unassigned].map((p) => {
      const contentPct = Math.round((p.content / totalContent) * 100);
      const revenuePct = Math.round((p.revenue / totalRevenue) * 100);
      const leadPct = Math.round((p.leads / totalLeads) * 100);
      const conversionRate = p.leads ? (p.conversions / p.leads) : 0;
      // Opportunity = revenue share / content share (higher = under-served high-value)
      const leverage = p.content === 0 ? (p.revenue > 0 ? 99 : 0) : Math.round((revenuePct / Math.max(contentPct, 1)) * 100) / 100;
      const priorityScore = Math.min(100, Math.round(revenuePct * 0.5 + (revenuePct - contentPct) * 1.5 + leverage * 5));
      return { persona_id: p.id, persona: p.title, content_pct: contentPct, revenue_pct: revenuePct, lead_pct: leadPct, conversion_rate: Math.round(conversionRate * 100) / 100, leverage, priority_score: Math.max(0, priorityScore), revenue: p.revenue, leads: p.leads };
    }).filter((r) => r.persona !== 'Unassigned' || r.content > 0);

    // Stage coverage
    const stages = ['awareness', 'consideration', 'decision', 'retention'];
    const stageCoverage = stages.map((s) => {
      const count = content.filter((c: any) => (c.journey_stage || '').toLowerCase() === s).length;
      return { stage: s, count, pct: Math.round((count / totalContent) * 100) };
    });

    // Angle coverage
    const angleCounts: Record<string, number> = {};
    content.forEach((c: any) => { const a = c.messaging_angle || 'unspecified'; angleCounts[a] = (angleCounts[a] || 0) + 1; });
    const angleCoverage = Object.entries(angleCounts).map(([angle, count]) => ({ angle, count, pct: Math.round((count / totalContent) * 100) }));

    // Format coverage (heuristic based on content metadata)
    const formats = { static_image: 0, carousel: 0, infographic: 0, executive_visual: 0, product_screenshot: 0, video_concept: 0, text_only: 0 };
    content.forEach((c: any) => {
      const t = (c.content_text || '').toLowerCase();
      if (!c.image_url) { formats.text_only++; return; }
      if (t.includes('carousel') || t.includes('slide ')) formats.carousel++;
      else if (t.includes('chart') || t.includes('data') || t.includes('infographic')) formats.infographic++;
      else if (t.includes('demo') || t.includes('screenshot') || t.includes('product')) formats.product_screenshot++;
      else if (t.includes('video') || t.includes('reel')) formats.video_concept++;
      else if (t.includes('executive') || t.includes('leadership')) formats.executive_visual++;
      else formats.static_image++;
    });
    const formatCoverage = Object.entries(formats).map(([k, v]) => ({ format: k, count: v, pct: Math.round((v / totalContent) * 100) }));

    // Opportunities: highest priority revenue gaps + missing formats + missing stages
    const opportunities: any[] = [];
    revenueCoverage.filter((r) => r.priority_score > 30).sort((a, b) => b.priority_score - a.priority_score).slice(0, 5).forEach((r) => {
      opportunities.push({
        kind: 'persona_gap',
        title: `${r.persona} under-served`,
        description: `Receives ${r.content_pct}% of content but drives ${r.revenue_pct}% of revenue (${r.leverage}x leverage).`,
        priority_score: r.priority_score,
        fix_type: 'campaign',
        fix_payload: { persona_id: r.persona_id, persona: r.persona },
      });
    });
    stageCoverage.filter((s) => s.pct < 10).forEach((s) => {
      opportunities.push({ kind: 'stage_gap', title: `${s.stage} stage under-covered`, description: `Only ${s.pct}% of content targets ${s.stage}.`, priority_score: 60, fix_type: 'campaign', fix_payload: { stage: s.stage } });
    });
    formatCoverage.filter((f) => f.pct < 5 && f.format !== 'text_only').slice(0, 3).forEach((f) => {
      opportunities.push({ kind: 'format_gap', title: `Missing format: ${f.format.replace('_', ' ')}`, description: `Only ${f.pct}% of content uses this format. Creative diversification needed.`, priority_score: 50, fix_type: 'creative_set', fix_payload: { format: f.format } });
    });

    // Coverage score: entropy across personas, stages, angles, formats (0-100)
    const entropy = (arr: number[]) => {
      const t = arr.reduce((s, n) => s + n, 0) || 1;
      const probs = arr.map((n) => n / t).filter((p) => p > 0);
      const h = -probs.reduce((s, p) => s + p * Math.log2(p), 0);
      const max = Math.log2(Math.max(arr.length, 2));
      return max ? h / max : 0;
    };
    const personaH = entropy(revenueCoverage.map((r) => r.content_pct));
    const stageH = entropy(stageCoverage.map((s) => s.count));
    const angleH = entropy(angleCoverage.map((a) => a.count));
    const formatH = entropy(formatCoverage.filter((f) => f.format !== 'text_only').map((f) => f.count));
    const coverageScore = Math.round((personaH * 0.4 + stageH * 0.2 + angleH * 0.2 + formatH * 0.2) * 100);

    // AI Coach via Gemini
    const topOpp = opportunities[0];
    let coach = { headline: 'Keep producing content to unlock insights.', action: 'Generate your first campaign in the Orchestrator.', impact: 'Baseline data needed.' };
    if (topOpp && Deno.env.get('LOVABLE_API_KEY')) {
      try {
        const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${Deno.env.get('LOVABLE_API_KEY')}` },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: `You are a growth coach. Based on this signal write a 3-line JSON {"headline":"...","action":"...","impact":"+X%..."}. No prose. Signal: ${JSON.stringify(topOpp)}. Revenue coverage snapshot: ${JSON.stringify(revenueCoverage.slice(0, 5))}.` }],
          }),
        });
        const j = await r.json();
        const txt = j?.choices?.[0]?.message?.content ?? '';
        const m = txt.match(/\{[\s\S]*\}/);
        if (m) coach = { ...coach, ...JSON.parse(m[0]) };
      } catch (_) { /* fallback */ }
    } else if (topOpp) {
      coach = { headline: topOpp.title, action: `Launch a ${topOpp.fix_type.replace('_', ' ')} addressing this gap.`, impact: 'Expected lift +15-25% on this segment.' };
    }

    const totals = { content: content.length, revenue: totalRevenue, leads: totalLeads, conversions: filteredConv.length };

    const { data: snapshot, error } = await supabase.from('portfolio_snapshots').insert({
      user_id: user.id,
      app_id: app_id ?? null,
      coverage_score: coverageScore,
      revenue_coverage: revenueCoverage,
      format_coverage: formatCoverage,
      stage_coverage: stageCoverage,
      angle_coverage: angleCoverage,
      opportunities,
      coach_headline: coach.headline,
      coach_action: coach.action,
      coach_impact: coach.impact,
      totals,
    }).select().single();
    if (error) throw error;

    return new Response(JSON.stringify({ snapshot }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
