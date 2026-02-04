import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AppCard } from "@/components/dashboard/AppCard";
import { ContentCalendarWidget } from "@/components/dashboard/ContentCalendarWidget";
import { ContentCalendarTable } from "@/components/dashboard/ContentCalendarTable";
import { PerformanceSummary } from "@/components/dashboard/PerformanceSummary";
import { FeatureCards } from "@/components/dashboard/FeatureCards";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const mockApps = [
  {
    name: "AppOne",
    description: "Lorem ipsum dolor sit amet mantes or and emarketing wperformance.",
    posts: 8,
    engagements: 8743,
    traffic: 186,
  },
  {
    name: "AppTwo",
    description: "Lorem ipsum dolor sit amet mantes or and emarketing wperformance.",
    posts: 8,
    engagements: 9456,
    traffic: 230,
  },
];

export default function Dashboard() {
  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6">
        {/* App Overview Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-foreground">App Overview</h2>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add App
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-2">
                {mockApps.map((app) => (
                  <AppCard key={app.name} {...app} />
                ))}
              </div>
            </div>
            <div>
              <ContentCalendarWidget />
            </div>
          </div>
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
