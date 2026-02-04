import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const dates = ["6 Oct", "21 Oct", "7/15", "24*", "772", "296", "231", "286", "393", "370"];

interface AppRowProps {
  name: string;
  subtitle: string;
  engagements: number;
  scheduled: number;
  progress: number;
  color: string;
}

function AppRow({ name, subtitle, engagements, scheduled, progress, color }: AppRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-accent/30 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-info/20 to-primary/20">
        <span className="text-xs font-bold text-primary">{name.charAt(0)}</span>
      </div>
      <div className="flex-1">
        <p className="font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Engagements</p>
        <p className="font-semibold">{engagements.toLocaleString()}</p>
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Engagements</p>
        <p className="font-semibold">{scheduled.toLocaleString()}</p>
      </div>
      <div className="w-32">
        <Progress value={progress} className={`h-2 ${color}`} />
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8">
        <RefreshCw className="h-4 w-4 text-info" />
      </Button>
    </div>
  );
}

export function ContentCalendarTable() {
  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display text-lg font-semibold">Content Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sorted</span>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {dates.map((date, idx) => (
            <Button
              key={date}
              variant={idx === 0 ? "default" : idx === 7 ? "outline" : "ghost"}
              size="sm"
              className={idx === 0 ? "bg-info text-info-foreground" : ""}
            >
              {date}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <AppRow
            name="AppOne"
            subtitle="Scheduled Engagements"
            engagements={6133}
            scheduled={1133}
            progress={75}
            color="bg-success"
          />
          <AppRow
            name="AppTwo"
            subtitle="Scheduled Engagements"
            engagements={6133}
            scheduled={1133}
            progress={60}
            color="bg-info"
          />
          <AppRow
            name="AutoBot"
            subtitle="Autobot: AppBot"
            engagements={5133}
            scheduled={1333}
            progress={45}
            color="bg-success"
          />
        </div>
      </CardContent>
    </Card>
  );
}
