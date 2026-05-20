import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApps } from "@/hooks/useApps";
import { useLearningInsights } from "@/hooks/useLearningInsights";
import { useAnalyzeConversions, useConversionStats } from "@/hooks/useConversionIntelligence";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, MousePointerClick, UserPlus, Target, TrendingUp, Lightbulb, Users, MessageSquare, Map, Zap, Globe } from "lucide-react";
import { Link } from "react-router-dom";

const ICONS: Record<string, any> = {
  top_persona: Users,
  top_angle: MessageSquare,
  top_stage: Map,
  platform_fit: Globe,
  top_hook: Zap,
  cta_recommendation: Target,
  landing_optimization: TrendingUp,
};

const TITLES: Record<string, string> = {
  top_persona: "Best persona",
  top_angle: "Best angle",
  top_stage: "Best journey stage",
  platform_fit: "Channel fit",
  top_hook: "Best hook pattern",
  cta_recommendation: "CTA suggestion",
  landing_optimization: "Landing page",
};

export default function Intelligence() {
  const { data: apps = [] } = useApps();
  const [appId, setAppId] = useState<string>("all");
  const scoped = appId === "all" ? undefined : appId;

  const { data: insights = [], isLoading: insightsLoading } = useLearningInsights(scoped);
  const { data: stats, isLoading: statsLoading } = useConversionStats(scoped);
  const analyze = useAnalyzeConversions();

  const grouped = useMemo(() => {
    const out: Record<string, typeof insights> = {};
    for (const i of insights) {
      (out[i.insight_type] ||= []).push(i);
    }
    return out;
  }, [insights]);

  const order = [
    "top_persona",
    "top_angle",
    "top_stage",
    "platform_fit",
    "top_hook",
    "cta_recommendation",
    "landing_optimization",
  ];

  const fmt = (n: number, digits = 0) =>
    n.toLocaleString(undefined, { maximumFractionDigits: digits });

  return (
    <DashboardLayout title="Intelligence">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Conversion Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              What's actually driving clicks, leads, and revenue — and what to do next.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={appId} onValueChange={setAppId}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All apps</SelectItem>
                {apps.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => analyze.mutate(scoped)} disabled={analyze.isPending} className="gap-2">
              {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analyze.isPending ? "Analyzing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Funnel stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={MousePointerClick} label="Clicks" value={fmt(stats?.total_clicks || 0)} loading={statsLoading} />
          <StatCard icon={UserPlus} label="Leads" value={fmt(stats?.total_leads || 0)} sub={stats?.total_clicks ? `${fmt((stats.click_to_lead || 0) * 100, 1)}% of clicks` : undefined} loading={statsLoading} />
          <StatCard icon={Target} label="Conversions" value={fmt(stats?.total_conversions || 0)} sub={stats?.total_leads ? `${fmt((stats.lead_to_conversion || 0) * 100, 1)}% of leads` : undefined} loading={statsLoading} />
          <StatCard icon={TrendingUp} label="Revenue" value={`$${fmt(stats?.total_revenue || 0)}`} loading={statsLoading} />
        </div>

        {/* Insights */}
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" /> AI recommendations
          </h2>

          {insightsLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : insights.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center space-y-3">
                <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No insights yet. Publish a few posts and capture some clicks, then refresh.
                </p>
                <Button onClick={() => analyze.mutate(scoped)} variant="outline" size="sm">
                  Run analysis now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {order
                .filter((k) => grouped[k]?.length)
                .map((k) => {
                  const i = grouped[k][0];
                  const Icon = ICONS[k] || Lightbulb;
                  return (
                    <Card key={i.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
                            <Icon className="h-3.5 w-3.5" /> {TITLES[k]}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {Math.round(i.confidence * 100)}% confidence
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm leading-relaxed">{i.insight_text}</p>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="text-xs text-muted-foreground">
          Tune your audience in <Link className="text-primary underline" to="/audience">Audience</Link> or your landing pages in <Link className="text-primary underline" to="/apps">Apps</Link>.
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ icon: Icon, label, value, sub, loading }: { icon: any; label: string; value: string; sub?: string; loading?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold">{loading ? "…" : value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
