import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLearningInsights, type LearningInsight } from "@/hooks/useLearningInsights";
import { useGenerateLearningInsights } from "@/hooks/useGenerateLearningInsights";
import { useApps } from "@/hooks/useApps";
import { Brain, Loader2, RefreshCw, Sparkles, AlertTriangle, Trophy } from "lucide-react";
import { useMemo } from "react";

interface Props {
  appFilter: string; // "all" or app id
  topPost?: {
    content_text: string;
    platform: string;
    impressions: number | null;
    engagements: number | null;
    app_id: string;
  } | null;
}

const WINNING_TYPES = new Set(["winning_angle", "winning_platform"]);
const WEAK_TYPES = new Set(["weak_cta", "weak_theme", "quality_issue"]);

export function InsightsSection({ appFilter, topPost }: Props) {
  const { data: apps } = useApps();
  const targetAppId =
    appFilter !== "all" ? appFilter : topPost?.app_id || apps?.[0]?.id;

  const { data: insights, isLoading } = useLearningInsights(targetAppId);
  const generateInsights = useGenerateLearningInsights();

  const { winning, weak, topExplanation } = useMemo(() => {
    const list: LearningInsight[] = insights || [];
    return {
      winning: list.filter((i) => WINNING_TYPES.has(i.insight_type)).slice(0, 3),
      weak: list.filter((i) => WEAK_TYPES.has(i.insight_type)).slice(0, 3),
      topExplanation: list.find((i) => i.insight_type === "top_post_explanation"),
    };
  }, [insights]);

  const hasAnyInsight = (winning.length + weak.length) > 0 || topExplanation;
  const onlyRecommendations = !hasAnyInsight && (insights?.length || 0) > 0;

  if (!targetAppId) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Marketing Coach</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
          onClick={() => generateInsights.mutate(targetAppId)}
          disabled={generateInsights.isPending}
        >
          {generateInsights.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          Re-analyze
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Loading insights…</CardContent></Card>
      ) : !hasAnyInsight && !onlyRecommendations ? (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            Publish a few more posts to unlock insights.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {/* What's Working */}
          {winning.length > 0 && (
            <Card className="border-success/30 bg-success/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-success" />
                  <h4 className="text-sm font-semibold text-foreground">What's Working</h4>
                </div>
                <ul className="space-y-1.5">
                  {winning.map((i) => (
                    <li key={i.id} className="text-sm text-foreground flex gap-2">
                      <span className="text-success">•</span>
                      <span>{i.insight_text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* What to Improve */}
          {weak.length > 0 && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h4 className="text-sm font-semibold text-foreground">What to Improve</h4>
                </div>
                <ul className="space-y-1.5">
                  {weak.map((i) => (
                    <li key={i.id} className="text-sm text-foreground flex gap-2">
                      <span className="text-warning">•</span>
                      <span>{i.insight_text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Why your top post worked */}
          {topPost && topExplanation && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Why your top post worked</h4>
                </div>
                <p className="text-sm text-foreground line-clamp-3 italic">"{topPost.content_text}"</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="text-[10px]">{topPost.platform}</Badge>
                  <span>{topPost.engagements || 0} engagements</span>
                </div>
                <p className="text-sm text-foreground pt-1 border-t border-border/40">
                  {topExplanation.insight_text}
                </p>
              </CardContent>
            </Card>
          )}

          {onlyRecommendations && insights && (
            <Card className="border-dashed">
              <CardContent className="p-4 text-sm text-muted-foreground">
                {insights[0].insight_text}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
