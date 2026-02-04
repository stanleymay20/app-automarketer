import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const scheduledPosts = [
  { day: 5, app: "AppOne", platform: "X", time: "10:00 AM" },
  { day: 6, app: "AppTwo", platform: "Instagram", time: "2:00 PM" },
  { day: 7, app: "AutoBot", platform: "LinkedIn", time: "11:00 AM" },
  { day: 10, app: "AppOne", platform: "LinkedIn", time: "9:00 AM" },
  { day: 12, app: "AppTwo", platform: "Facebook", time: "3:00 PM" },
  { day: 15, app: "AutoBot", platform: "X", time: "10:00 AM" },
  { day: 18, app: "AppOne", platform: "Instagram", time: "1:00 PM" },
  { day: 22, app: "AppTwo", platform: "LinkedIn", time: "11:00 AM" },
];

const appColors: Record<string, string> = {
  AppOne: "bg-info",
  AppTwo: "bg-success",
  AutoBot: "bg-secondary",
};

export default function Calendar() {
  const [currentMonth] = useState(new Date(2025, 1)); // February 2025

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentMonth);

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 border-b border-r border-border/50" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const postsForDay = scheduledPosts.filter((p) => p.day === day);
      const isToday = day === 4; // Mock today as Feb 4

      days.push(
        <div
          key={day}
          className={`h-28 border-b border-r border-border/50 p-2 ${
            isToday ? "bg-accent/50" : ""
          }`}
        >
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
              isToday ? "bg-primary text-primary-foreground" : "text-foreground"
            }`}
          >
            {day}
          </span>
          <div className="mt-1 space-y-1">
            {postsForDay.slice(0, 2).map((post, idx) => (
              <div
                key={idx}
                className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground ${
                  appColors[post.app]
                }`}
              >
                {post.app} • {post.platform}
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
    }

    return days;
  };

  return (
    <DashboardLayout title="Calendar">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="font-display text-xl font-semibold">
              {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Schedule Post
          </Button>
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
            <div className="grid grid-cols-7">{renderCalendarDays()}</div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex items-center gap-6">
          {Object.entries(appColors).map(([app, color]) => (
            <div key={app} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded ${color}`} />
              <span className="text-sm text-muted-foreground">{app}</span>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
