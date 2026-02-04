import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppCard } from "@/components/dashboard/AppCard";
import { ContentCalendarWidget } from "@/components/dashboard/ContentCalendarWidget";
import { ContentCalendarTable } from "@/components/dashboard/ContentCalendarTable";
import { PerformanceSummary } from "@/components/dashboard/PerformanceSummary";
import { FeatureCards } from "@/components/dashboard/FeatureCards";
import { AddAppDialog } from "@/components/apps/AddAppDialog";
import { useApps } from "@/hooks/useApps";
import { useUserSettings } from "@/hooks/useUserSettings";
import { AppWindow, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { data: apps, isLoading } = useApps();
  const { data: settings } = useUserSettings();

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* Mode indicator */}
        {settings?.autopilot_mode && (
          <div className="rounded-lg bg-success/10 border border-success/20 p-4 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-success">
              Autopilot Mode Active — New content will be automatically approved
            </span>
          </div>
        )}

        {/* App Overview Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">App Overview</h2>
            <AddAppDialog />
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : apps && apps.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  {apps.slice(0, 4).map((app) => (
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
                {apps.length > 4 && (
                  <Link to="/apps">
                    <Button variant="outline" className="w-full">
                      View all {apps.length} apps
                    </Button>
                  </Link>
                )}
              </div>
              <div>
                <ContentCalendarWidget />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
              <AppWindow className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-display text-lg font-semibold mb-2">No apps yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first app to start generating marketing content.
              </p>
              <AddAppDialog 
                trigger={
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Your First App
                  </Button>
                }
              />
            </div>
          )}
        </section>

        {/* Content Calendar Table & Performance */}
        <section className="grid gap-6 lg:grid-cols-2">
          <ContentCalendarTable />
          <PerformanceSummary />
        </section>

        {/* Feature Cards */}
        <section>
          <FeatureCards />
        </section>
      </div>
    </DashboardLayout>
  );
}
