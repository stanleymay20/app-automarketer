import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const days = ["Sun 22", "Mon", "Wed", "Thurs", "Fri", "Apr 8"];

const scheduledContent = [
  { day: 0, color: "bg-info" },
  { day: 1, color: "bg-secondary" },
  { day: 2, color: "bg-success" },
  { day: 3, color: "bg-info" },
  { day: 4, color: "bg-secondary" },
  { day: 5, color: "bg-success" },
];

export function ContentCalendarWidget() {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-display text-lg font-semibold">Content Calendar</CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {days.map((day, idx) => (
            <div key={day} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs text-muted-foreground">{day}</span>
              <div className="flex h-16 w-full flex-col items-center justify-end gap-1 rounded-md bg-accent/50 p-1">
                {scheduledContent
                  .filter((c) => c.day === idx)
                  .map((content, i) => (
                    <div
                      key={i}
                      className={`h-3 w-full rounded-sm ${content.color}`}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
