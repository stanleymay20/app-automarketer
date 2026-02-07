import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { UsageLimits } from "@/hooks/usePlanLimits";

interface UsageCardProps {
  planLimits: UsageLimits;
}

export function UsageCard({ planLimits }: UsageCardProps) {
  // Calculate warning level
  const postsPercentage = typeof planLimits.postsRemaining === "number"
    ? ((planLimits.limits.postsPerMonth - planLimits.postsRemaining) / planLimits.limits.postsPerMonth) * 100
    : 0;
  
  const appsPercentage = typeof planLimits.appsRemaining === "number"
    ? ((planLimits.limits.apps - planLimits.appsRemaining) / planLimits.limits.apps) * 100
    : 0;

  const postsWarning = postsPercentage >= 90 ? "critical" : postsPercentage >= 70 ? "warning" : "ok";
  const appsWarning = appsPercentage >= 90 ? "critical" : appsPercentage >= 70 ? "warning" : "ok";

  const showCriticalAlert = postsWarning === "critical" || appsWarning === "critical";
  const showWarningAlert = (postsWarning === "warning" || appsWarning === "warning") && !showCriticalAlert;

  return (
    <div className="space-y-3">
      {/* Critical alert - limit reached */}
      {showCriticalAlert && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Monthly limit approaching.</strong> Upgrade to keep Autopilot running.
            <Link to="/settings">
              <Button variant="link" size="sm" className="ml-1 h-auto p-0">
                Upgrade now
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning alert - approaching limit */}
      {showWarningAlert && (
        <Alert className="bg-warning/10 border-warning/30">
          <TrendingUp className="h-4 w-4 text-warning" />
          <AlertDescription>
            You're using {Math.max(postsPercentage, appsPercentage).toFixed(0)}% of your monthly limit.
          </AlertDescription>
        </Alert>
      )}

      {/* Usage card */}
      <Card className="border-secondary bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Monthly Usage</CardTitle>
              <CardDescription className="text-xs mt-1">
                {planLimits.plan === "free"
                  ? "Free plan"
                  : planLimits.plan === "starter"
                  ? "Starter plan"
                  : "Pro plan"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Posts usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Posts</span>
              <span className={`text-sm font-semibold ${
                postsWarning === "critical"
                  ? "text-destructive"
                  : postsWarning === "warning"
                  ? "text-warning"
                  : "text-muted-foreground"
              }`}>
                {planLimits.limits.postsPerMonth === -1
                  ? "Unlimited"
                  : `${planLimits.usage.postsThisMonth} / ${planLimits.limits.postsPerMonth}`}
              </span>
            </div>
            {planLimits.limits.postsPerMonth !== -1 && (
              <Progress value={postsPercentage} className="h-2" />
            )}
          </div>

          {/* Apps usage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Apps</span>
              <span className={`text-sm font-semibold ${
                appsWarning === "critical"
                  ? "text-destructive"
                  : appsWarning === "warning"
                  ? "text-warning"
                  : "text-muted-foreground"
              }`}>
                {planLimits.limits.apps === -1
                  ? "Unlimited"
                  : `${planLimits.usage.apps} / ${planLimits.limits.apps}`}
              </span>
            </div>
            {planLimits.limits.apps !== -1 && (
              <Progress value={appsPercentage} className="h-2" />
            )}
          </div>

          {/* Free plan note */}
          {planLimits.plan === "free" && (
            <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-secondary">
              Autopilot will pause after you reach your monthly limit. Scheduled posts will still publish.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
