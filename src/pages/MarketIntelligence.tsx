import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApps } from "@/hooks/useApps";
import { useMarketIntelligence, useGenerateGrowthIntelligence } from "@/hooks/useMarketIntelligence";
import {
  TrendingUp,
  Swords,
  Target,
  MessageCircle,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Calendar,
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

  const totalItems =
    (data?.market.length ?? 0) +
    (data?.competitors.length ?? 0) +
    (data?.opportunities.length ?? 0) +
    (data?.customers.length ?? 0) +
    (data?.recommendations.length ?? 0);

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
            {/* Recommendations first — the punchline */}
            {!!data?.recommendations.length && (
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Sparkles className="h-5 w-5 text-primary" /> Campaign Opportunities
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {data.recommendations.map((r: any) => (
                    <Card key={r.id} className="p-4 space-y-2 border-l-4 border-l-primary">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-tight">{r.title}</h3>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{r.recommendation_type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.explanation}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <ScorePill label="Confidence" value={r.confidence_score} />
                        <Badge variant="secondary" className="text-[10px] capitalize">{r.expected_impact} impact</Badge>
                      </div>
                    </Card>
                  ))}
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
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <Swords className="h-5 w-5 text-secondary" /> Competitor Watch
                </h2>
                <div className="space-y-2">
                  {data.competitors.map((c: any) => (
                    <Card key={c.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{c.competitor_name}</h3>
                            <Badge variant="outline" className="text-[10px] capitalize">{c.signal_type}</Badge>
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
                    </Card>
                  ))}
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
