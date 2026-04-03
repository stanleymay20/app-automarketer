import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGrowthGoals } from "@/hooks/useGrowthGoals";
import { Target, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const goalTypeLabels: Record<string, string> = {
  signups: "Signups",
  traffic: "Traffic",
  awareness: "Awareness",
  engagement: "Engagement",
};

export function GrowthGoalCard() {
  const { data: goals } = useGrowthGoals();
  const activeGoal = goals?.[0];

  if (!activeGoal) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Target className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">No active goal</p>
            <p className="text-sm text-muted-foreground">Set a growth goal to track progress</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progress = Math.min(100, Math.round((activeGoal.current_value / activeGoal.target_value) * 100));
  const daysLeft = Math.max(0, Math.ceil((new Date(activeGoal.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <Card>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Growth Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            {goalTypeLabels[activeGoal.goal_type] || activeGoal.goal_type}
          </span>
          <span className="text-xs text-muted-foreground">{daysLeft}d left</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {activeGoal.current_value} / {activeGoal.target_value}
          </span>
          <span>{progress}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
