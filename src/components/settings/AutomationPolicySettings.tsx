import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAutomationPolicy, useUpdateAutomationPolicy } from "@/hooks/useAutomationPolicies";
import { Bot, Shield, Clock, AlertTriangle, Send } from "lucide-react";

function useDebouncedMutate(mutateFn: (val: any) => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  return useCallback(
    (updates: any) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => mutateFn(updates), delay);
    },
    [mutateFn, delay]
  );
}

export function AutomationPolicySettings() {
  const { data: policy, isLoading } = useAutomationPolicy();
  const updatePolicy = useUpdateAutomationPolicy();
  const debouncedUpdate = useDebouncedMutate(updatePolicy.mutate);

  const [localQuality, setLocalQuality] = useState<number | null>(null);
  const [localMaxPosts, setLocalMaxPosts] = useState<string>("");

  // Sync local state when policy loads
  useEffect(() => {
    if (policy) {
      setLocalQuality(policy.min_quality_score);
      setLocalMaxPosts(String(policy.max_posts_per_day));
    }
  }, [policy]);

  if (isLoading) {
    return <div className="h-64 rounded-lg bg-muted animate-pulse" />;
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Automation Policy
        </CardTitle>
        <CardDescription>
          Control how ScrollMarketer makes autonomous decisions. These guardrails keep your marketing safe.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Auto-approve toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="font-medium text-foreground">Auto-Approve Content</p>
            </div>
            <p className="text-sm text-muted-foreground">
              When enabled, posts that pass quality thresholds are approved automatically. Otherwise, all posts require manual review.
            </p>
          </div>
          <Switch
            checked={policy?.auto_approve_enabled ?? false}
            onCheckedChange={(checked) => updatePolicy.mutate({ auto_approve_enabled: checked })}
          />
        </div>

        {/* Auto-publish toggle */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                <p className="font-medium text-foreground">Auto-Publish Scheduled Posts</p>
              </div>
              <p className="text-sm text-muted-foreground">
                When enabled, approved posts are automatically published at their scheduled time. Otherwise, posts wait for manual publishing.
              </p>
            </div>
            <Switch
              checked={policy?.auto_publish_enabled ?? false}
              onCheckedChange={(checked) => updatePolicy.mutate({ auto_publish_enabled: checked })}
            />
          </div>

          {policy?.auto_publish_enabled && (
            <div className="space-y-2 pl-6 border-l-2 border-primary/20">
              <div className="space-y-1">
                <Label htmlFor="publishTime" className="text-foreground">Default Publish Time</Label>
                <p className="text-xs text-muted-foreground">
                  Posts without a specific schedule will be published at this time daily.
                </p>
              </div>
              <Input
                id="publishTime"
                type="time"
                value={policy?.auto_publish_time?.slice(0, 5) ?? "09:00"}
                onChange={(e) => {
                  debouncedUpdate({ auto_publish_time: e.target.value + ":00" });
                }}
                className="w-36"
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-foreground">Minimum Quality Score</Label>
            <p className="text-xs text-muted-foreground">
              Posts must score at least this high to be auto-approved. Higher = stricter. (50–100)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Slider
              value={[localQuality ?? 85]}
              onValueChange={([val]) => {
                setLocalQuality(val);
                debouncedUpdate({ min_quality_score: val });
              }}
              min={50}
              max={100}
              step={5}
              className="flex-1"
            />
            <span className="w-10 text-right text-sm font-semibold text-foreground">
              {localQuality ?? 85}
            </span>
          </div>
        </div>

        {/* Max posts per day */}
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="maxPosts" className="text-foreground">Max Posts Per Day</Label>
            <p className="text-xs text-muted-foreground">
              Hard daily cap across all platforms. Prevents over-posting even if content is auto-approved.
            </p>
          </div>
          <Input
            id="maxPosts"
            type="number"
            min={1}
            max={20}
            value={localMaxPosts}
            onChange={(e) => {
              setLocalMaxPosts(e.target.value);
              const val = parseInt(e.target.value);
              if (val >= 1 && val <= 20) {
                debouncedUpdate({ max_posts_per_day: val });
              }
            }}
            className="w-24"
          />
        </div>

        {/* Quiet hours */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label className="text-foreground">Quiet Hours</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              No posts will be published during this window. Useful for respecting audience time zones.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Select
                value={String(policy?.quiet_hours_start ?? 22)}
                onValueChange={(val) => updatePolicy.mutate({ quiet_hours_start: parseInt(val) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="mt-5 text-muted-foreground">→</span>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Select
                value={String(policy?.quiet_hours_end ?? 6)}
                onValueChange={(val) => updatePolicy.mutate({ quiet_hours_end: parseInt(val) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Escalation mode */}
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <Label className="text-foreground">Escalation Mode</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              What happens when something goes wrong — failed publish, low confidence, or repeated underperformance.
            </p>
          </div>
          <Select
            value={policy?.escalation_mode ?? "alert"}
            onValueChange={(val) => updatePolicy.mutate({ escalation_mode: val })}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alert">Alert only</SelectItem>
              <SelectItem value="pause">Pause publishing</SelectItem>
              <SelectItem value="manual">Switch to manual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}