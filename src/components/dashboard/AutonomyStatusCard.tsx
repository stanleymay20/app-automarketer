import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutomationPolicy } from "@/hooks/useAutomationPolicies";
import { useContent } from "@/hooks/useContent";
import { Bot, Shield, Zap } from "lucide-react";

export function AutonomyStatusCard() {
  const { data: policy } = useAutomationPolicy();
  const { data: content } = useContent();

  const recentPublished = (content || []).filter(
    (c) => c.status === "published" && c.published_at
  ).slice(0, 1);

  const pendingReview = (content || []).filter((c) => c.status === "pending").length;
  const failedCount = (content || []).filter((c) => c.status === "failed").length;

  const autonomyLevel = policy?.auto_approve_enabled ? "Semi-Autonomous" : "Assisted";

  return (
    <Card className={policy?.auto_approve_enabled 
      ? "bg-gradient-to-r from-primary/5 to-success/5 border-primary/20" 
      : ""
    }>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Autonomy Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${policy?.auto_approve_enabled ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
          <span className="text-sm font-semibold text-foreground">{autonomyLevel}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Min score: {policy?.min_quality_score || 85}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Zap className="h-3 w-3" />
            <span>Max/day: {policy?.max_posts_per_day || 4}</span>
          </div>
        </div>

        {pendingReview > 0 && (
          <p className="text-xs text-warning">{pendingReview} post{pendingReview > 1 ? "s" : ""} awaiting review</p>
        )}
        {failedCount > 0 && (
          <p className="text-xs text-destructive">{failedCount} failed post{failedCount > 1 ? "s" : ""}</p>
        )}
      </CardContent>
    </Card>
  );
}
