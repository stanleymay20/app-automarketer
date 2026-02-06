import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Loader2, Calendar, TrendingUp, Eye, MessageSquare, MousePointerClick } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface WeeklyReport {
  id: string;
  period_start: string;
  period_end: string;
  posts_published: number;
  total_impressions: number;
  total_engagements: number;
  total_clicks: number;
  top_app_name: string | null;
  top_platform: string | null;
  engagement_rate: number | null;
  sent_at: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export default function WeeklyReports() {
  const { user } = useAuth();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["weekly-reports", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(12);

      if (error) throw error;
      return (data || []) as WeeklyReport[];
    },
    enabled: !!user,
  });

  const latestReport = reports?.[0];

  return (
    <DashboardLayout title="Weekly Reports">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !reports || reports.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No weekly reports yet</h3>
            <p className="text-muted-foreground">
              Weekly reports are generated every Monday at 8am UTC. Once you publish content, you'll see reports here.
            </p>
          </div>
        ) : (
          <>
            {/* Latest Report Preview */}
            {latestReport && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5 shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="font-display flex items-center gap-2">
                        <Mail className="h-5 w-5 text-primary" />
                        Latest Report
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(latestReport.sent_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Posts Published</p>
                      <p className="text-2xl font-bold text-foreground">{latestReport.posts_published}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Eye className="h-4 w-4" /> Impressions
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatNumber(latestReport.total_impressions)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-4 w-4" /> Engagements
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatNumber(latestReport.total_engagements)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MousePointerClick className="h-4 w-4" /> Clicks
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatNumber(latestReport.total_clicks)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4" /> Engagement Rate
                      </p>
                      <p className="text-2xl font-bold text-success">
                        {(latestReport.engagement_rate || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  {(latestReport.top_app_name || latestReport.top_platform) && (
                    <div className="mt-6 pt-6 border-t border-border flex gap-8">
                      {latestReport.top_app_name && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Top Performing App</p>
                          <p className="font-semibold text-foreground">{latestReport.top_app_name}</p>
                        </div>
                      )}
                      {latestReport.top_platform && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Top Platform</p>
                          <p className="font-semibold text-foreground uppercase">{latestReport.top_platform}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Report History */}
            <div>
              <h2 className="text-lg font-display font-semibold mb-4">Report History</h2>
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id} className="shadow-card">
                    <CardContent className="p-4">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Period</p>
                          <p className="text-sm font-medium">
                            {new Date(report.period_start).toLocaleDateString()} -{" "}
                            {new Date(report.period_end).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Posts</p>
                          <p className="text-sm font-semibold">{report.posts_published}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Impressions</p>
                          <p className="text-sm font-semibold">{formatNumber(report.total_impressions)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Engagements</p>
                          <p className="text-sm font-semibold">{formatNumber(report.total_engagements)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Rate</p>
                          <p className="text-sm font-semibold text-success">{(report.engagement_rate || 0).toFixed(1)}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Sent</p>
                          <p className="text-sm font-medium">
                            {formatDistanceToNow(new Date(report.sent_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
