import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Eye, MousePointerClick, Users, TrendingUp, TrendingDown, Loader2, BarChart3, ArrowRight } from "lucide-react";
import { useContentAnalytics, useWeeklyTrend } from "@/hooks/useAnalytics";
import { useContent } from "@/hooks/useContent";
import { useApps } from "@/hooks/useApps";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { InsightsSection } from "@/components/analytics/InsightsSection";

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function Analytics() {
  const [appFilter, setAppFilter] = useState<string>("all");
  const { data: analytics, isLoading: analyticsLoading } = useContentAnalytics();
  const { data: trend, isLoading: trendLoading } = useWeeklyTrend();
  const { data: content } = useContent();
  const { data: apps } = useApps();

  const isLoading = analyticsLoading || trendLoading;

  // Per-app filtered metrics (client-side, from content)
  const filtered = useMemo(() => {
    const items = (content || []).filter(
      (c) => c.status === "published" && (appFilter === "all" || c.app_id === appFilter)
    );
    const totalImpressions = items.reduce((s, c) => s + (c.impressions || 0), 0);
    const totalEngagements = items.reduce((s, c) => s + (c.engagements || 0), 0);
    const totalClicks = items.reduce((s, c) => s + (c.clicks || 0), 0);
    return {
      items,
      totalPosts: items.length,
      totalImpressions,
      totalEngagements,
      totalClicks,
    };
  }, [content, appFilter]);

  const hasData = filtered.totalPosts > 0;
  const topPost = filtered.items.slice().sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0];

  // Stats: when filtering by app, hide week-over-week % (trend is global)
  const showTrend = appFilter === "all";
  const stats = [
    { label: "Views", value: filtered.totalImpressions, change: showTrend ? (trend?.impressionsChange || 0) : 0, icon: Eye },
    { label: "Engagements", value: filtered.totalEngagements, change: showTrend ? (trend?.engagementsChange || 0) : 0, icon: MousePointerClick },
    { label: "Clicks", value: filtered.totalClicks, change: showTrend ? (trend?.clicksChange || 0) : 0, icon: Users },
  ];

  const weeklyData = showTrend
    ? (trend?.weeklyData || []).map((w) => ({
        name: new Date(w.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        views: w.impressions,
        engagements: w.engagements,
        clicks: w.clicks,
      }))
    : [];

  const engagementRate = filtered.totalImpressions > 0
    ? (filtered.totalEngagements / filtered.totalImpressions) * 100
    : 0;

  let insightMessage = "Start publishing to see how your content performs.";
  if (hasData) {
    if (engagementRate > 5) insightMessage = "🔥 Your content is performing great! Keep this momentum going.";
    else if (engagementRate > 2) insightMessage = "📈 Solid engagement. Try stronger hooks to boost it further.";
    else insightMessage = "💡 Tip: Posts with a strong opening hook get 2x more engagement.";
  }

  return (
    <DashboardLayout title="Performance">
      <div className="space-y-6 max-w-3xl mx-auto">
        {apps && apps.length > 1 && (
          <div className="flex items-center justify-end">
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Filter by app"
            >
              <option value="all">All apps</option>
              {apps.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No performance data yet</h3>
            <p className="text-muted-foreground mb-4">Publish your first post to start tracking results.</p>
            <Link to="/create">
              <Button className="gap-1.5">
                Create a Post <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Insight Banner */}
            <Card className="bg-gradient-to-r from-primary/5 to-info/5 border-primary/10">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-foreground">{insightMessage}</p>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid gap-3 grid-cols-3">
              {stats.map((stat) => {
                const isUp = stat.change >= 0;
                return (
                  <Card key={stat.label} className="shadow-card">
                    <CardContent className="p-4 text-center space-y-1">
                      <stat.icon className="h-5 w-5 text-muted-foreground mx-auto" />
                      <p className="text-2xl font-bold text-foreground">{formatNumber(stat.value)}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                      {stat.change !== 0 && (
                        <div className={`flex items-center justify-center gap-0.5 text-[10px] font-medium ${isUp ? "text-success" : "text-destructive"}`}>
                          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isUp ? "+" : ""}{stat.change.toFixed(0)}% vs last week
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Trend Chart */}
            {weeklyData.length > 1 && (
              <Card className="shadow-card">
                <CardContent className="p-4">
                  <h3 className="font-display text-sm font-semibold mb-4">Performance Trend</h3>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Line type="monotone" dataKey="views" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="engagements" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex justify-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-info" />
                      <span className="text-xs text-muted-foreground">Views</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-success" />
                      <span className="text-xs text-muted-foreground">Engagements</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top Post */}
            {topPost && (
              <Card className="shadow-card">
                <CardContent className="p-4 space-y-2">
                  <h3 className="font-display text-sm font-semibold">🏆 Top Post This Week</h3>
                  <p className="text-sm text-foreground line-clamp-3">{topPost.content_text}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px]">{topPost.platform}</Badge>
                    <span>{formatNumber(topPost.impressions || 0)} views</span>
                    <span>{formatNumber(topPost.engagements || 0)} engagements</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Marketing Intelligence Loop: What's Working / Improve / Why */}
            <InsightsSection
              appFilter={appFilter}
              topPost={topPost ? {
                content_text: topPost.content_text,
                platform: topPost.platform,
                impressions: topPost.impressions ?? 0,
                engagements: topPost.engagements ?? 0,
                app_id: topPost.app_id,
              } : null}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
