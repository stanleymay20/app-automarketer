import { Bell, CheckCircle2, AlertCircle, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuditLog } from "@/hooks/useAuditLog";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const STORAGE_KEY = "notifications:lastSeenAt";

function iconFor(actionType: string) {
  if (actionType.includes("publish")) return Send;
  if (actionType.includes("fail") || actionType.includes("error")) return AlertCircle;
  if (actionType.includes("generate") || actionType.includes("discover")) return Sparkles;
  return CheckCircle2;
}

function labelFor(entry: { action_type: string; entity_type: string; details: Record<string, unknown> }) {
  const a = entry.action_type.replace(/_/g, " ");
  const e = entry.entity_type.replace(/_/g, " ");
  return `${a.charAt(0).toUpperCase() + a.slice(1)} · ${e}`;
}

export function NotificationsBell() {
  const { data: entries = [] } = useAuditLog(15);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLastSeen(localStorage.getItem(STORAGE_KEY));
  }, []);

  const unreadCount = lastSeen
    ? entries.filter((e) => new Date(e.created_at) > new Date(lastSeen)).length
    : entries.length;

  const handleOpenChange = (open: boolean) => {
    if (open && entries.length > 0) {
      const newest = entries[0].created_at;
      localStorage.setItem(STORAGE_KEY, newest);
      setLastSeen(newest);
    }
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" aria-label="Notifications">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <span className="text-xs text-muted-foreground">{entries.length} recent</span>
        </div>
        <ScrollArea className="h-[320px]">
          {entries.length === 0 ? (
            <div className="flex h-[280px] flex-col items-center justify-center px-4 text-center">
              <Bell className="mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">You're all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Activity from your AI agent will appear here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((entry) => {
                const Icon = iconFor(entry.action_type);
                const isUnread = lastSeen ? new Date(entry.created_at) > new Date(lastSeen) : true;
                return (
                  <li key={entry.id} className={isUnread ? "bg-primary/5" : ""}>
                    <div className="flex items-start gap-3 px-4 py-3">
                      <div className="mt-0.5 rounded-full bg-muted p-1.5">
                        <Icon className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{labelFor(entry)}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border p-2">
          <Button variant="ghost" size="sm" className="w-full justify-center text-xs" onClick={() => navigate("/dashboard")}>
            View all activity
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
