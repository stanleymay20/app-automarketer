import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLearningInsights } from "@/hooks/useLearningInsights";
import { Brain, Lightbulb } from "lucide-react";

export function LearningInsightCard() {
  const { data: insights } = useLearningInsights();
  const latest = insights?.[0];

  if (!latest) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Brain className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No insights yet</p>
            <p className="text-sm text-muted-foreground">Insights will appear as content performs</p>
          </div>
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
