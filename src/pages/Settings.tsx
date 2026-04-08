import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformConnections } from "@/components/settings/PlatformConnections";
import { AutomationPolicySettings } from "@/components/settings/AutomationPolicySettings";
import { GrowthGoalsSection } from "@/components/settings/GrowthGoalsSection";
import { useUserSettings, useUpdateUserSettings } from "@/hooks/useUserSettings";
import { useAuth } from "@/contexts/AuthContext";

const PLAN_LIMITS: Record<string, { apps: string; posts: string; platforms: string }> = {
  free: { apps: "1", posts: "10", platforms: "X (Twitter)" },
  starter: { apps: "3", posts: "100", platforms: "All" },
  pro: { apps: "Unlimited", posts: "Unlimited", platforms: "All" },
};

type NotificationKey =
  | "notification_content_ready"
  | "notification_post_published"
  | "notification_weekly_report"
  | "notification_engagement_alerts";

const NOTIFICATION_SETTINGS: { key: NotificationKey; title: string; desc: string }[] = [
  { key: "notification_content_ready", title: "Content Ready for Approval", desc: "Show a notification when new content is generated and ready for review" },
  { key: "notification_post_published", title: "Post Published", desc: "Show a confirmation when content is successfully published to a platform" },
  { key: "notification_weekly_report", title: "Weekly Performance Report", desc: "Generate and store weekly performance summaries every Monday" },
  { key: "notification_engagement_alerts", title: "Engagement Alerts", desc: "Notify when posts receive high engagement (coming soon)" },
];

function PlanDetailsFromSettings({ plan }: { plan: string }) {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Apps included</span>
        <span className="font-medium">{limits.apps}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Posts per month</span>
        <span className="font-medium">{limits.posts}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Platforms</span>
        <span className="font-medium">{limits.platforms}</span>
      </div>
    </div>
  );
}

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "general";
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <DashboardLayout title="Settings">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 flex-wrap">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="autonomy">Autonomy</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Profile Settings</CardTitle>
              <CardDescription>Your account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={user?.email || ""} disabled className="bg-muted" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Contact support to update your email address.</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Default Posting Settings</CardTitle>
              <CardDescription>Configure how ScrollMarketer handles content by default.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Autopilot Mode</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve content without manual review
                  </p>
                </div>
                <Switch
                  checked={settings?.autopilot_mode ?? false}
                  onCheckedChange={(checked) => updateSettings.mutate({ autopilot_mode: checked, approval_mode: !checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Smart Scheduling</p>
                  <p className="text-sm text-muted-foreground">
                    AI chooses optimal posting times
                  </p>
                </div>
                <Switch
                  checked={settings?.smart_scheduling ?? true}
                  onCheckedChange={(checked) => updateSettings.mutate({ smart_scheduling: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Default Brand Tone</Label>
                <Select
                  value={settings?.default_brand_tone ?? "professional"}
                  onValueChange={(value) => updateSettings.mutate({ default_brand_tone: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="bold">Bold</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autonomy" className="space-y-6">
          <AutomationPolicySettings />
          <GrowthGoalsSection />
        </TabsContent>

        <TabsContent value="platforms" className="space-y-6">
          <PlatformConnections />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Notification Preferences</CardTitle>
              <CardDescription>Choose what notifications you receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {NOTIFICATION_SETTINGS.map((notification) => (
                <div key={notification.key} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.desc}</p>
                  </div>
                  <Switch
                    checked={settings?.[notification.key] ?? true}
                    onCheckedChange={(checked) => updateSettings.mutate({ [notification.key]: checked })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display">Current Plan</CardTitle>
              <CardDescription>Manage your subscription plan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-accent/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold capitalize">{settings?.plan || "Free"} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {settings?.plan === "free" ? "€0/month" : settings?.plan === "starter" ? "€29/month" : "€79/month"}
                    </p>
                  </div>
                  <Button variant="outline" disabled>Upgrade (Coming Soon)</Button>
                </div>
              </div>
              <PlanDetailsFromSettings plan={settings?.plan || "free"} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}