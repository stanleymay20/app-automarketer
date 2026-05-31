import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApps } from "@/hooks/useApps";
import {
  useMarketIntelligence,
  useGenerateGrowthIntelligence,
  useExecuteRecommendation,
} from "@/hooks/useMarketIntelligence";
import {
  TrendingUp,
  Swords,
  Target,
  MessageCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Calendar,
  Rocket,
  Layout,
  Layers,
  Bookmark,
  X,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function ScorePill({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? "bg-success/15 text-success" : value >= 50 ? "bg-info/15 text-info" : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
      {label} {value}%
    </span>
  );
}

function EmptyState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <Card className="p-8 text-center space-y-4">
      <Sparkles className="h-10 w-10 mx-auto text-primary" />
      <div>
        <h3 className="font-display text-lg font-semibold">No intelligence yet</h3>
        <p className="text-sm text-muted-foreground">Generate your first growth intelligence brief.</p>
      </div>
      <Button onClick={onGenerate} disabled={loading} size="lg">
        {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
        Generate Intelligence
      </Button>
    </Card>
  );
}

export default function MarketIntelligence() {
  const { data: apps } = useApps();
  const [appId, setAppId] = useState<string | undefined>();
  const effectiveAppId = appId ?? apps?.[0]?.id;
  const { data, isLoading } = useMarketIntelligence(effectiveAppId);
  const generate = useGenerateGrowthIntelligence();
  const execute = useExecuteRecommendation();
  const [busyRec, setBusyRec] = useState<string | null>(null);

  const run = (id: string, action: Parameters<typeof execute.mutate>[0]["action"]) => {
    setBusyRec(`${id}:${action}`);
    execute.mutate({ id, action }, { onSettled: () => setBusyRec(null) });
  };

  const visibleRecs = (data?.recommendations ?? []).filter((r: any) => r.status !== "dismissed");

  const totalItems =
    (data?.market.length ?? 0) +
    (data?.competitors.length ?? 0) +
    (data?.opportunities.length ?? 0) +
    (data?.customers.length ?? 0) +
    visibleRecs.length;

  return (
    <DashboardLayout title="Market Intelligence">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">Market Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              What's happening in your market — and what to do about it.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {apps && apps.length > 1 && (
              <Select value={effectiveAppId} onValueChange={setAppId}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {apps.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => generate.mutate(effectiveAppId)}
              disabled={generate.isPending || !effectiveAppId}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${generate.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-muted-foreground">Loading...</Card>
        ) : totalItems === 0 ? (
          <EmptyState onGenerate={() => generate.mutate(effectiveAppId)} loading={generate.isPending} />
        ) : (
          <div className="space-y-8">
            {/* Evidence banner */}
            {data?.evidence && (
              <Card className="p-4 bg-muted/40 border-dashed">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-semibold text-muted-foreground">Evidence basis:</span>
                  <Badge variant="outline">{data.evidence.posts_analyzed} posts</Badge>
                  <Badge variant="outline">{data.evidence.clicks} clicks</Badge>
                  <Badge variant="outline">{data.evidence.leads} leads</Badge>
                  <Badge variant="outline">{data.evidence.conversions} conversions</Badge>
                  {data.evidence.revenue > 0 && (
                    <Badge variant="outline">${data.evidence.revenue.toFixed(0)} revenue</Badge>
                  )}
                  {data.evidence.posts_analyzed === 0 && data.evidence.clicks === 0 && (
                    <span className="text-muted-foreground">
                      · No attribution yet — recommendations are initial hypotheses.
                    </span>
                  )}
                </div>
              </Card>
            )}

            {/* Recommendation Memory */}
            {data?.memory && data.memory.total > 0 && (
              <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recommendation Memory
                  </h3>
                  <span className="text-[10px] text-muted-foreground">What the AI is learning</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {[
                    { label: "Suggested", value: data.memory.total },
                    { label: "Accepted", value: data.memory.accepted },
                    { label: "Generated", value: data.memory.generated },
                    { label: "Published", value: data.memory.published },
                    { label: "Converted", value: data.memory.converted },
                    { label: "Revenue", value: `$${Math.round(data.memory.revenue)}` },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <div className="font-display text-lg font-bold">{m.value}</div>
                      <div className="text-[10px] text-muted-foreground">{m.label}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Recommendations — executable */}
            {!!visibleRecs.length && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Sparkles className="h-5 w-5 text-primary" /> Campaign Opportunities
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleRecs.map((r: any) => {
                    const ev = data!.evidence;
                    const basisLabel =
                      ev && (ev.posts_analyzed > 0 || ev.clicks > 0 || ev.leads > 0)
                        ? `${ev.posts_analyzed} campaigns · ${ev.clicks} clicks · ${ev.leads} leads · ${ev.conversions} conv.`
                        : "Initial hypothesis — no attribution yet";
                    const accepted = !!r.accepted_at;
                    const hasCampaign = !!r.campaign_id;
                    const hasLanding = !!r.landing_app_id;
                    const hasCreatives = (r.creative_count ?? 0) > 0;
                    const busy = (a: string) => busyRec === `${r.id}:${a}`;
                    return (
                      <Card key={r.id} className="p-4 space-y-3 border-l-4 border-l-primary">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-sm leading-tight">{r.title}</h3>
                          <Badge variant="outline" className="text-[10px] capitalize shrink-0">{r.recommendation_type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{r.explanation}</p>

                        <div className="flex flex-wrap items-center gap-2">
                          <ScorePill label="Confidence" value={r.confidence_score} />
                          <Badge variant="secondary" className="text-[10px] capitalize">{r.expected_impact ?? "medium"} impact</Badge>
                          {r.status === "saved" && <Badge variant="outline" className="text-[10px]">Saved</Badge>}
                        </div>

                        <p className="text-[10px] text-muted-foreground border-t border-dashed pt-2">
                          Evidence: {basisLabel}
                        </p>

                        {(accepted || hasCampaign || hasLanding || hasCreatives) && (
                          <div className="flex flex-wrap gap-1.5">
                            {hasCampaign && (
                              <Badge className="bg-success/15 text-success hover:bg-success/15 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Campaign
                              </Badge>
                            )}
                            {hasLanding && (
                              <Badge className="bg-success/15 text-success hover:bg-success/15 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Landing
                              </Badge>
                            )}
                            {hasCreatives && (
                              <Badge className="bg-success/15 text-success hover:bg-success/15 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />{r.creative_count} creatives
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            variant={hasCampaign ? "outline" : "default"}
                            onClick={() => run(r.id, "campaign")}
                            disabled={busy("campaign")}
                          >
                            <Rocket className="h-3.5 w-3.5 mr-1.5" />
                            {busy("campaign") ? "Working…" : hasCampaign ? "Campaign ready" : "Generate Campaign"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => run(r.id, "creative_set")}
                            disabled={busy("creative_set") || !hasCampaign}
                          >
                            <Layers className="h-3.5 w-3.5 mr-1.5" />
                            {busy("creative_set") ? "Working…" : "Creative Set"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => run(r.id, "landing")}
                            disabled={busy("landing")}
                          >
                            <Layout className="h-3.5 w-3.5 mr-1.5" />
                            {busy("landing") ? "Working…" : hasLanding ? "Refresh Landing" : "Landing Page"}
                          </Button>
                          {hasCreatives ? (
                            <Button size="sm" variant="ghost" asChild>
                              <Link to="/content">
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                Review drafts
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => run(r.id, "save")}
                              disabled={busy("save")}
                            >
                              <Bookmark className="h-3.5 w-3.5 mr-1.5" />
                              Save idea
                            </Button>
                          )}
                        </div>

                        <button
                          onClick={() => run(r.id, "dismiss")}
                          disabled={busy("dismiss")}
                          className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <X className="h-3 w-3" /> Dismiss
                        </button>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Market Trends */}
            {!!data?.market.length && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <TrendingUp className="h-5 w-5 text-info" /> Market Trends
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.market.map((s: any) => (
                    <Card key={s.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm">{s.title}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{s.signal_type?.replace("_", " ")}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <ScorePill label="Impact" value={s.impact_score} />
                        <ScorePill label="Confidence" value={s.confidence_score} />
                        {s.source && <span className="text-[10px] text-muted-foreground">· {s.source}</span>}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Competitors */}
            {!!data?.competitors.length && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                    <Swords className="h-5 w-5 text-secondary" /> Competitor Watch
                  </h2>
                  <span className="text-[10px] text-muted-foreground">AI-estimated until live sources connected</span>
                </div>
                <div className="space-y-2">
                  {data.competitors.map((c: any) => {
                    const estimated = !c.source_url && c.metadata?.source_basis !== "verified";
                    return (
                      <Card key={c.id} className={`p-4 space-y-2 ${estimated ? "border-dashed" : ""}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center flex-wrap gap-2">
                              <h3 className="font-semibold text-sm">{c.competitor_name}</h3>
                              <Badge variant="outline" className="text-[10px] capitalize">{c.signal_type}</Badge>
                              {estimated ? (
                                <Badge variant="secondary" className="text-[10px]">Estimated</Badge>
                              ) : (
                                <Badge className="text-[10px] bg-success/15 text-success hover:bg-success/15">Verified</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                          </div>
                          <ScorePill label="Impact" value={c.impact_score} />
                        </div>
                        {c.recommended_response && (
                          <div className="rounded-md bg-accent/40 p-2 text-xs">
                            <span className="font-medium">Respond: </span>{c.recommended_response}
                          </div>
                        )}
                        {c.source_url && (
                          <a href={c.source_url} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-1">
                            Source <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Opportunities */}
            {!!data?.opportunities.length && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Target className="h-5 w-5 text-success" /> Opportunity Radar
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.opportunities.map((o: any) => (
                    <Card key={o.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm">{o.title}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{o.category}</Badge>
                      </div>
                      {o.description && <p className="text-xs text-muted-foreground">{o.description}</p>}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <ScorePill label="Fit" value={o.relevance_score} />
                        {o.deadline && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(o.deadline), { addSuffix: true })}
                          </span>
                        )}
                        {o.url && (
                          <a href={o.url} target="_blank" rel="noreferrer" className="ml-auto text-[10px] text-primary flex items-center gap-1">
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {o.recommendation && <p className="text-xs pt-1"><span className="font-medium">Action: </span>{o.recommendation}</p>}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Customer Signals */}
            {!!data?.customers.length && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <MessageCircle className="h-5 w-5 text-primary" /> Customer Signals
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.customers.map((s: any) => (
                    <Card key={s.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm">{s.topic}</h3>
                          <p className="text-xs text-muted-foreground">{s.audience}</p>
                        </div>
                        <ScorePill label="Trend" value={s.trend_score} />
                      </div>
                      {s.recommendation && (
                        <div className="rounded-md bg-accent/40 p-2 text-xs">
                          <span className="font-medium">Campaign: </span>{s.recommendation}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
