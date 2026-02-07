import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppCard } from "@/components/dashboard/AppCard";
import { AutopilotStatusCard } from "@/components/dashboard/AutopilotStatusCard";
import { WeeklySummaryCard } from "@/components/dashboard/WeeklySummaryCard";
import { UsageCard } from "@/components/dashboard/UsageCard";
import { AddAppDialog } from "@/components/apps/AddAppDialog";
import { useApps } from "@/hooks/useApps";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { usePlatformConnections, Platform } from "@/hooks/usePlatformConnections";
import { useContent } from "@/hooks/useContent";
import { AppWindow, Plus, AlertTriangle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

export default function Dashboard() {
  const { data: apps, isLoading } = useApps();
  const { data: planLimits } = usePlanLimits();
  const { data: connections } = usePlatformConnections();
  const { data: content } = useContent();

  // Redirect to onboarding if no apps
  if (!isLoading && apps && apps.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  // Check for scheduled content on disconnected platforms
  const disconnectedPlatforms = new Set(
    connections?.filter((c) => !c.connected).map((c) => c.platform) || []
  );
  const scheduledOnDisconnected = (content || []).filter(
    (c) =>
      (c.status === "pending" || c.status === "approved") &&
      disconnectedPlatforms.has(c.platform as Platform)
  );

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Warning for disconnected platforms */}
        {scheduledOnDisconnected.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>
                {scheduledOnDisconnected.length} scheduled post
                {scheduledOnDisconnected.length > 1 ? "s" : ""}
              </strong>{" "}
              won't publish — platforms not connected.{" "}
              <Link to="/settings" className="underline font-medium">
                Connect platforms
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Autopilot Status - the hero card */}
        <AutopilotStatusCard />

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* App Cards */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Your Apps</h2>
              {planLimits?.canCreateApp ? (
                <AddAppDialog />
              ) : (
                <Link to="/settings">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Crown className="h-4 w-4 text-warning" />
                    Upgrade to add more
                  </Button>
                </Link>
              )}
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {apps?.slice(0, 4).map((app) => (
                  <AppCard
                    key={app.id}
                    id={app.id}
                    name={app.name}
                    description={app.description || "No description"}
                    posts={app.posts_count || 0}
                    engagements={app.engagements_count || 0}
                    traffic={app.traffic_count || 0}
                    platforms={app.platforms || []}
                  />
                ))}
              </div>
            )}

            {apps && apps.length > 4 && (
              <Link to="/apps">
                <Button variant="outline" className="w-full">
                  View all {apps.length} apps
                </Button>
              </Link>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <WeeklySummaryCard />
            {planLimits && <UsageCard planLimits={planLimits} />}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
