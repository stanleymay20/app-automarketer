import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react";
import { useState, useMemo } from "react";
import { useContent } from "@/hooks/useContent";
import { useApps } from "@/hooks/useApps";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday, parseISO } from "date-fns";
import { Link } from "react-router-dom";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const statusColors: Record<string, string> = {
  approved: "bg-success",
  pending: "bg-warning",
  published: "bg-info",
  failed: "bg-destructive",
};

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appFilter, setAppFilter] = useState<string>("all");
  const { data: content } = useContent();
  const { data: apps } = useApps();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const contentByDay = useMemo(() => {
    const map = new Map<string, typeof content>();
    if (!content) return map;
    const filtered = appFilter === "all" ? content : content.filter((c) => c.app_id === appFilter);
    for (const item of filtered) {
      const dateStr = item.scheduled_for
        ? format(parseISO(item.scheduled_for), "yyyy-MM-dd")
        : item.published_at
          ? format(parseISO(item.published_at), "yyyy-MM-dd")
          : null;
      if (dateStr) {
        const list = map.get(dateStr) || [];
        list.push(item);
        map.set(dateStr, list);
      }
    }
    return map;
  }, [content, appFilter]);

  return (
    <DashboardLayout title="Calendar">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-display text-xl font-semibold">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {apps && apps.length > 1 && (
              <select
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Filter by app"
              >
                <option value="all">All apps</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <Link to="/content">
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                View Content
              </Button>
            </Link>
          </div>
        </div>

        <Card className="shadow-card overflow-hidden">
          <CardContent className="p-0">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="border-r border-border/50 bg-muted/50 px-3 py-2 text-center text-sm font-medium text-muted-foreground last:border-r-0"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {/* Empty padding cells */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`empty-${i}`} className="h-28 border-b border-r border-border/50" />
              ))}

              {/* Actual days */}
              {daysInMonth.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const postsForDay = contentByDay.get(dateKey) || [];
                const today = isToday(day);

                return (
                  <div
                    key={dateKey}
                    className={`h-28 border-b border-r border-border/50 p-2 ${today ? "bg-accent/50" : ""}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                        today ? "bg-primary text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-1">
                      {postsForDay.slice(0, 2).map((post, idx) => (
                        <div
                          key={idx}
                          className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground ${
                            statusColors[post.status] || "bg-muted"
                          }`}
                        >
                          {(post as any).apps?.name || "App"} • {post.platform}
                        </div>
                      ))}
                      {postsForDay.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{postsForDay.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-6 flex-wrap">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded ${color}`} />
              <span className="text-sm text-muted-foreground capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}