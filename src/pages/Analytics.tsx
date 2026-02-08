import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Eye, MousePointerClick, Users, Share2, Loader2, BarChart3 } from "lucide-react";
import { useContentAnalytics, useWeeklyTrend } from "@/hooks/useAnalytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

function formatTrend(value: number): string {
  if (value > 0) return `+${value.toFixed(0)}%`;
  if (value < 0) return `${value.toFixed(0)}%`;
  return "0%";
}

export default function Analytics() {
  const { data: analytics, isLoading: analyticsLoading } = useContentAnalytics();
  const { data: trend, isLoading: trendLoading } = useWeeklyTrend();

  const isLoading = analyticsLoading || trendLoading;

  const overviewStats = [
    { 
      label: "Impressions", 
      value: formatNumber(analytics?.totalImpressions || 0), 
      change: trend?.impressionsChange || 0,
      icon: Eye 
    },
    { 
      label: "Engagements", 
      value: formatNumber(analytics?.totalEngagements || 0), 
      change: trend?.engagementsChange || 0,
      icon: MousePointerClick 
    },
    { 
      label: "Clicks", 
      value: formatNumber(analytics?.totalClicks || 0), 
      change: trend?.clicksChange || 0,
      icon: Users 
    },
    { 
      label: "Posts", 
      value: formatNumber(analytics?.totalPosts || 0), 
      change: trend?.postsChange || 0,
      icon: Share2 
    },
  ];

  const weeklyData = (trend?.weeklyData || []).map((w) => ({
    name: new Date(w.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    impressions: w.impressions,
    engagements: w.engagements,
    clicks: w.clicks,
  }));

  const hasData = (analytics?.totalPosts || 0) > 0;

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !hasData ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No analytics data yet</h3>
            <p className="text-muted-foreground">
              Publish some content to start tracking performance metrics.
            </p>
          </div>
        ) : (
          <>
            {/* 4 Key Metrics with Week-over-Week Trends */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {overviewStats.map((stat) => {
                const isUp = stat.change >= 0;
                return (
                  <Card key={stat.label} className="shadow-card">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="rounded-lg bg-accent p-3">
                        <stat.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                          <span
                            className={`flex items-center text-xs font-medium ${
                              isUp ? "text-success" : "text-destructive"
                            }`}
                          >
                            {isUp ? (
                              <TrendingUp className="mr-0.5 h-3 w-3" />
                            ) : (
                              <TrendingDown className="mr-0.5 h-3 w-3" />
                            )}
                            {formatTrend(stat.change)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">vs last week</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Weekly Performance Chart */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="font-display">Weekly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {weeklyData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Line type="monotone" dataKey="impressions" stroke="hsl(var(--info))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="engagements" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No weekly data available yet.</p>
                )}
                <div className="mt-4 flex justify-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-info" />
                    <span className="text-sm text-muted-foreground">Impressions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-sm text-muted-foreground">Engagements</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm text-muted-foreground">Clicks</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
