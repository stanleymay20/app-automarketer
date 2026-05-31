import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApps } from "@/hooks/useApps";
import { useLatestPortfolioSnapshot, useAnalyzePortfolio } from "@/hooks/useContentIntelligence";
import { useOrchestrateCampaign } from "@/hooks/useOrchestrator";
import { Brain, RefreshCw, TrendingUp, Sparkles, AlertCircle, Wand2 } from "lucide-react";

export default function ContentIntelligence() {
  const { data: apps = [] } = useApps();
  const [appId, setAppId] = useState<string>("");
  const { data: snapshot, isLoading } = useLatestPortfolioSnapshot(appId || null);
  const analyze = useAnalyzePortfolio();
  const orchestrate = useOrchestrateCampaign();

  const opportunities = useMemo(() => (snapshot?.opportunities ?? []).slice().sort((a: any, b: any) => b.priority_score - a.priority_score), [snapshot]);

  const fixGap = (opp: any) => {
    if (!appId) return;
    orchestrate.mutate({
      app_id: appId,
      persona_id: opp.fix_payload?.persona_id ?? null,
      journey_stage: opp.fix_payload?.stage ?? null,
      messaging_angle: opp.fix_payload?.angle ?? null,
      goal: `Fix gap: ${opp.title}`,
      campaign_name: `Gap fix · ${opp.title}`,
    });
  };

  return (
    <DashboardLayout title="Portfolio Intelligence">
      <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" />Content Portfolio Intelligence</h1>
            <p className="text-sm text-muted-foreground">Revenue-weighted coverage. Find your biggest growth opportunity.</p>
          </div>
          <div className="flex gap-2">
            <Select value={appId} onValueChange={setAppId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All apps" /></SelectTrigger>
              <SelectContent>
                {apps.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => analyze.mutate(appId || null)} disabled={analyze.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${analyze.isPending ? "animate-spin" : ""}`} />
              {snapshot ? "Recompute" : "Analyze"}
            </Button>
          </div>
        </div>

        {/* AI Growth Coach */}
        {snapshot?.coach_headline && (
          <Card className="border-secondary/40 bg-gradient-to-br from-secondary/10 to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-5 w-5 text-secondary" />Your biggest growth opportunity this week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-lg font-semibold">{snapshot.coach_headline}</p>
              <p className="text-sm text-muted-foreground">Recommended action: {snapshot.coach_action}</p>
              <Badge variant="secondary" className="mt-1">Expected impact: {snapshot.coach_impact}</Badge>
            </CardContent>
          </Card>
        )}

        {/* Coverage Score */}
        {snapshot && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Coverage score</div><div className="text-3xl font-bold text-primary">{snapshot.coverage_score}</div><Progress value={snapshot.coverage_score} className="h-1 mt-2" /></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Content pieces</div><div className="text-3xl font-bold">{snapshot.totals?.content ?? 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Attributed revenue</div><div className="text-3xl font-bold">${Math.round(snapshot.totals?.revenue ?? 0).toLocaleString()}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Open opportunities</div><div className="text-3xl font-bold text-secondary">{opportunities.length}</div></CardContent></Card>
          </div>
        )}

        {!snapshot && !isLoading && (
          <Card><CardContent className="p-12 text-center">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Run analysis to compute revenue-weighted content coverage.</p>
            <Button onClick={() => analyze.mutate(appId || null)} disabled={analyze.isPending}>Analyze portfolio</Button>
          </CardContent></Card>
        )}

        {snapshot && (
          <Tabs defaultValue="opportunities">
            <TabsList>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
              <TabsTrigger value="revenue">Revenue coverage</TabsTrigger>
              <TabsTrigger value="formats">Creative coverage</TabsTrigger>
              <TabsTrigger value="stages">Journey & angles</TabsTrigger>
            </TabsList>

            <TabsContent value="opportunities" className="space-y-3 mt-4">
              {opportunities.length === 0 && <p className="text-sm text-muted-foreground p-6 text-center">No major gaps detected. Keep publishing.</p>}
              {opportunities.map((opp: any, i: number) => (
                <Card key={i} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-4 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{opp.kind?.replace("_", " ")}</Badge>
                        <Badge className="bg-secondary/20 text-secondary text-[10px]">Priority {opp.priority_score}</Badge>
                      </div>
                      <p className="font-semibold">{opp.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{opp.description}</p>
                    </div>
                    <Button size="sm" onClick={() => fixGap(opp)} disabled={!appId || orchestrate.isPending}>
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />Fix gap
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {!appId && opportunities.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertCircle className="h-3 w-3" />Select an app above to enable Fix gap.</p>
              )}
            </TabsContent>

            <TabsContent value="revenue" className="mt-4">
              <Card><CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr><th className="text-left p-3">Persona</th><th className="text-right p-3">Content %</th><th className="text-right p-3">Revenue %</th><th className="text-right p-3">Lead %</th><th className="text-right p-3">Leverage</th><th className="text-right p-3">Priority</th></tr>
                  </thead>
                  <tbody>
                    {(snapshot.revenue_coverage ?? []).map((r: any) => (
                      <tr key={r.persona_id} className="border-b last:border-0">
                        <td className="p-3 font-medium">{r.persona}</td>
                        <td className="text-right p-3">{r.content_pct}%</td>
                        <td className="text-right p-3 font-semibold text-primary">{r.revenue_pct}%</td>
                        <td className="text-right p-3">{r.lead_pct}%</td>
                        <td className="text-right p-3">{r.leverage}x</td>
                        <td className="text-right p-3"><Badge variant={r.priority_score > 60 ? "default" : "outline"}>{r.priority_score}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="formats" className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {(snapshot.format_coverage ?? []).map((f: any) => (
                <Card key={f.format}><CardContent className="p-4">
                  <div className="text-xs text-muted-foreground capitalize">{f.format.replace(/_/g, " ")}</div>
                  <div className="text-2xl font-bold">{f.pct}%</div>
                  <Progress value={f.pct} className="h-1 mt-2" />
                  <div className="text-[10px] text-muted-foreground mt-1">{f.count} pieces</div>
                </CardContent></Card>
              ))}
            </TabsContent>

            <TabsContent value="stages" className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-1"><TrendingUp className="h-4 w-4" />Journey stages</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(snapshot.stage_coverage ?? []).map((s: any) => (
                    <Card key={s.stage}><CardContent className="p-4">
                      <div className="text-xs text-muted-foreground capitalize">{s.stage}</div>
                      <div className="text-2xl font-bold">{s.pct}%</div>
                      <Progress value={s.pct} className="h-1 mt-2" />
                    </CardContent></Card>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-2">Messaging angles</h3>
                <div className="flex flex-wrap gap-2">
                  {(snapshot.angle_coverage ?? []).map((a: any) => (
                    <Badge key={a.angle} variant="outline">{a.angle} · {a.pct}%</Badge>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
