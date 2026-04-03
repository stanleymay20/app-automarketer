import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLearningInsights } from "@/hooks/useLearningInsights";
import { useGenerateLearningInsights } from "@/hooks/useGenerateLearningInsights";
import { useApps } from "@/hooks/useApps";
import { Brain, Lightbulb, RefreshCw, Loader2 } from "lucide-react";

export function LearningInsightCard() {
  const { data: insights } = useLearningInsights();
  const { data: apps } = useApps();
  const generateInsights = useGenerateLearningInsights();
  const latest = insights?.[0];
  const firstApp = apps?.[0];

  if (!latest) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Brain className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">No insights yet</p>
            <p className="text-xs text-muted-foreground">Generate insights from your published content performance.</p>
          </div>
          {firstApp && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => generateInsights.mutate(firstApp.id)}
              disabled={generateInsights.isPending}
            >
              {generateInsights.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Brain className="h-3 w-3" />
              )}
              Analyze Performance
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Latest Insight
          {firstApp && (
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6"
              onClick={() => generateInsights.mutate(firstApp.id)}
              disabled={generateInsights.isPending}
            >
              {generateInsights.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              )}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-warning mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">{latest.insight_text}</p>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{latest.platform ? `${latest.platform}` : "General"}</span>
          <span>{Math.round(latest.confidence * 100)}% confidence</span>
        </div>
      </CardContent>
    </Card>
  );
}
