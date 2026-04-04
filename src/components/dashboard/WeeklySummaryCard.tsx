import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContentAnalytics } from "@/hooks/useAnalytics";
import { TrendingUp, Eye, MessageSquare, MousePointerClick, FileText } from "lucide-react";

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
}

export function WeeklySummaryCard() {
  const { data: analytics } = useContentAnalytics();

  const stats = [
    { label: "Posts", value: analytics?.totalPosts || 0, icon: FileText },
    { label: "Views", value: analytics?.totalImpressions || 0, icon: Eye },
    { label: "Engage", value: analytics?.totalEngagements || 0, icon: MessageSquare },
    { label: "Clicks", value: analytics?.totalClicks || 0, icon: MousePointerClick },
  ];

  const engagementRate = analytics?.engagementRate || 0;

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {stats.map((stat) => (
            <div key={stat.label} className="space-y-0.5">
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 uppercase tracking-wide">
                <stat.icon className="h-3 w-3" />
                {stat.label}
              </p>
              <p className="text-lg font-bold text-foreground">{formatNumber(stat.value)}</p>
            </div>
          ))}
        </div>
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Engagement Rate</span>
          <span className="text-sm font-bold text-success">{engagementRate.toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
