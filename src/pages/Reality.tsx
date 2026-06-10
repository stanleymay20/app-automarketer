import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useState } from "react";
import { useFunnelTest, usePublishFailures, useRealitySnapshot } from "@/hooks/useReality";
import { AlertCircle, Activity, Target, Gauge, Sparkles, PlayCircle, RefreshCw, MousePointerClick, UserPlus, CheckCircle2, DollarSign, ArrowRight, ShieldCheck, CircleDashed } from "lucide-react";

import { formatDistanceToNow } from "date-fns";

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />;
}

function MetricCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function Reality() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, isLoading, refetch, isFetching } = useRealitySnapshot();
  const failures = usePublishFailures();
  const funnelTest = useFunnelTest();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <Header title="Reality" onMenuToggle={() => setSidebarOpen(true)} />
        <main className="container mx-auto max-w-6xl space-y-6 p-4 md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Reality</h1>
              <p className="text-sm text-muted-foreground">What's actually happening — not what should be.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { refetch(); failures.refetch(); }} disabled={isFetching}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />Refresh
              </Button>
              <Button size="sm" onClick={() => funnelTest.mutate()} disabled={funnelTest.isPending}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {funnelTest.isPending ? "Running…" : "Fire test funnel"}
              </Button>
          </div>

          {/* Proof Chain — the moat made visible */}
          {(() => {
            const f = data?.funnel;
            const clicks = f?.clicks ?? 0;
            const leads = f?.leads ?? 0;
            const convs = f?.conversions ?? 0;
            const rev = f?.revenue ?? 0;
            const fullyProven = clicks > 0 && leads > 0 && convs > 0 && rev > 0;
            const partial = (clicks > 0 || leads > 0 || convs > 0 || rev > 0) && !fullyProven;
            const steps = [
              { label: "Click", value: clicks, icon: MousePointerClick, ok: clicks > 0 },
              { label: "Lead", value: leads, icon: UserPlus, ok: leads > 0 },
              { label: "Conversion", value: convs, icon: CheckCircle2, ok: convs > 0 },
              { label: "Revenue", value: `$${rev.toLocaleString()}`, icon: DollarSign, ok: rev > 0 },
            ];
            return (
              <Card className={fullyProven ? "border-emerald-500/40 bg-emerald-500/5" : partial ? "border-amber-500/40 bg-amber-500/5" : "border-border"}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShieldCheck className="h-4 w-4" />
                      Proof Chain — Content to Revenue
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={
                        fullyProven
                          ? "border-emerald-500/50 text-emerald-700 bg-emerald-500/10"
                          : partial
                          ? "border-amber-500/50 text-amber-700 bg-amber-500/10"
                          : "border-border text-muted-foreground"
                      }
                    >
                      {fullyProven ? "Proven end-to-end" : partial ? "Partially proven" : "Not yet proven"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    The one thing competitors can't show. Every step here is a real database row, not a claim.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 items-stretch">
                    {steps.map((s, i) => {
                      const Icon = s.icon;
                      return (
                        <div key={s.label} className="relative">
                          <div
                            className={`rounded-lg border p-3 h-full transition-colors ${
                              s.ok
                                ? "border-emerald-500/40 bg-emerald-500/5"
                                : "border-dashed border-border bg-muted/30"
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              {s.ok ? (
                                <Icon className="h-4 w-4 text-emerald-600" />
                              ) : (
                                <CircleDashed className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</span>
                            </div>
                            <div className={`mt-1 text-lg font-semibold tabular-nums ${s.ok ? "" : "text-muted-foreground"}`}>
                              {s.value}
                            </div>
                          </div>
                          {i < steps.length - 1 && (
                            <ArrowRight className="hidden md:block absolute top-1/2 -right-2 -translate-y-1/2 h-3 w-3 text-muted-foreground z-10" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {!fullyProven && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      {clicks === 0
                        ? "No real visitor has hit the funnel yet. Use \"Fire test funnel\" to verify the plumbing, then drive a real visitor."
                        : "Plumbing works. Next milestone: a real conversion with real revenue from a real visitor."}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}


          {/* Health score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4" />Intelligence Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-6">
                <div className="text-5xl font-bold tabular-nums">{data?.health_score ?? "—"}<span className="text-2xl text-muted-foreground">/100</span></div>
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {data && Object.entries(data.health_breakdown).map(([k, v]) => (
                    <div key={k}>
                      <div className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</div>
                      <Progress value={v} className="h-1.5 mt-1" />
                      <div className="mt-1 tabular-nums">{v}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Publish SLOs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />Publish Reliability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricCard label="Success Rate" value={`${data?.publish.success_rate ?? 0}%`} sub={`${data?.publish.published ?? 0} / ${(data?.publish.published ?? 0) + (data?.publish.failed ?? 0)}`} />
                <MetricCard label="Failed" value={data?.publish.failed ?? 0} />
                <MetricCard label="Avg Publish Time" value={data?.publish.avg_latency_ms ? `${(data.publish.avg_latency_ms / 1000).toFixed(1)}s` : "—"} />
                <MetricCard label="Recovered by Retry" value={data?.publish.recovered_by_retry ?? 0} />
              </div>

              {(data?.publish.by_platform.length ?? 0) > 0 && (
                <div>
                  <div className="mb-2 text-sm font-medium">Success rate by platform</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {data!.publish.by_platform.map((p) => {
                      const tone = p.success_rate >= 95 ? "text-emerald-600" : p.success_rate >= 50 ? "text-amber-600" : "text-rose-600";
                      return (
                        <div key={p.platform} className="rounded-md border p-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium capitalize">{p.platform}</span>
                            <span className={`tabular-nums font-semibold ${tone}`}>{p.success_rate}%</span>
                          </div>
                          <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
                            <span>{p.published} published</span>
                            <span>{p.failed} failed</span>
                          </div>
                          <Progress value={p.success_rate} className="h-1.5 mt-2" />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    The overall rate is a blended average. Per-platform tells the real story.
                  </div>
                </div>
              )}

              <div>
                <div className="mb-2 text-sm font-medium">Top failure causes</div>
                {failures.isLoading ? <div className="text-sm text-muted-foreground">Analyzing…</div> : (failures.data?.groups.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground">No failures recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {failures.data!.groups.map((g) => (
                      <div key={g.category} className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">{g.category}</Badge>
                            <span className="text-sm">{g.count} posts ({g.pct}%)</span>
                            {g.platforms.length > 0 && <span className="text-xs text-muted-foreground">on {g.platforms.join(", ")}</span>}
                          </div>
                        </div>
                        {g.top_reason && <div className="mt-1 truncate text-xs text-muted-foreground">{g.top_reason}</div>}
                        <div className="mt-1 text-xs text-primary">→ {g.remediation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Funnel + Attribution */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" />Funnel (lifetime)</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Clicks", data?.funnel.clicks ?? 0],
                    ["Leads", data?.funnel.leads ?? 0],
                    ["Conversions", data?.funnel.conversions ?? 0],
                    ["Revenue", `$${(data?.funnel.revenue ?? 0).toLocaleString()}`],
                  ].map(([l, v]) => (
                    <div key={l as string} className="rounded-md border p-3">
                      <div className="text-xs text-muted-foreground">{l}</div>
                      <div className="mt-1 text-lg font-semibold tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
                {data && data.funnel.clicks === 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-xs">
                    <AlertCircle className="h-4 w-4 text-amber-600" /> Funnel never fired. Use "Fire test funnel" to verify end-to-end.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" />Attribution Coverage</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data && Object.entries({
                  "Content → Persona": data.attribution.content_to_persona,
                  "Content → Distribution": data.attribution.content_to_distribution,
                  "Content → Campaign": data.attribution.content_to_campaign,
                  "Content → Recommendation": data.attribution.content_to_recommendation,
                  "Leads → Content": data.attribution.leads_to_content,
                  "Revenue → Content": data.attribution.revenue_to_content,
                }).map(([k, v]) => (
                  <div key={k}>
                    <div className="flex justify-between text-xs"><span>{k}</span><span className="tabular-nums">{v}%</span></div>
                    <Progress value={v} className="h-1.5" />
                  </div>
                ))}
                <div className="pt-1 text-xs text-muted-foreground">Goal: 100% on every line.</div>
              </CardContent>
            </Card>
          </div>

          {/* Intelligence utilization */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Intelligence Utilization</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(data?.engines ?? []).map((e) => (
                  <div key={e.key} className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <StatusDot ok={e.rows > 0} />
                      <span>{e.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {e.rows} rows • {e.last_activity ? `${formatDistanceToNow(new Date(e.last_activity))} ago` : "never"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Adoption */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Adoption (generated → used)</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(data?.adoption ?? []).map((a) => {
                const rate = a.generated ? Math.round((a.used / a.generated) * 100) : 0;
                return (
                  <div key={a.name}>
                    <div className="flex justify-between text-xs"><span>{a.name}</span><span className="tabular-nums">{a.used} / {a.generated} ({rate}%)</span></div>
                    <Progress value={rate} className="h-1.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {isLoading && <div className="text-sm text-muted-foreground">Loading reality…</div>}
        </main>
      </div>
    </div>
  );
}
