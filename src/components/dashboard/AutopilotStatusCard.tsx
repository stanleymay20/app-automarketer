import { Card, CardContent } from "@/components/ui/card";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useContent } from "@/hooks/useContent";
import { Rocket, Clock, Pause } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function AutopilotStatusCard() {
  const { data: settings } = useUserSettings();
  const { data: content } = useContent();

  const isAutopilot = settings?.autopilot_mode ?? false;

  const upcomingPosts = (content || [])
    .filter((c) => c.status === "approved" && c.scheduled_for)
    .sort((a, b) => new Date(a.scheduled_for!).getTime() - new Date(b.scheduled_for!).getTime());

  const nextPost = upcomingPosts[0];

  if (!isAutopilot) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <Pause className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Approval Mode</p>
            <p className="text-xs text-muted-foreground">Posts need manual approval</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-success/10 to-primary/10 border-success/20">
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-success/20 flex items-center justify-center shrink-0">
          <Rocket className="h-4 w-4 text-success" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground text-sm">Autopilot Active</p>
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
          </div>
          {nextPost ? (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              Next in {formatDistanceToNow(new Date(nextPost.scheduled_for!))}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Auto-generating & scheduling</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
