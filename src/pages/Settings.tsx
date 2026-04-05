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

export default function Settings() {
   const [searchParams] = useSearchParams();
   const defaultTab = searchParams.get("tab") || "general";
   const { user } = useAuth();
   const { data: settings } = useUserSettings();
   const updateSettings = useUpdateUserSettings();
 
  return (
    <DashboardLayout title="Settings">
       <Tabs defaultValue={defaultTab} className="w-full">
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
              <CardDescription>Manage your account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <Input id="company" placeholder="Acme Inc." />
              </div>
              <Button disabled>Save Changes (Coming Soon)</Button>
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
                    Automatically post content without approval
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
              {[
                { title: "Content Ready for Approval", desc: "Get notified when new content is generated" },
                { title: "Post Published", desc: "Confirmation when content goes live" },
                { title: "Weekly Performance Report", desc: "Summary of your marketing performance" },
                { title: "Engagement Alerts", desc: "Notify when posts get high engagement" },
               ].map((notification, index) => {
                 const settingKeys = [
                   "notification_content_ready",
                   "notification_post_published", 
                   "notification_weekly_report",
                   "notification_engagement_alerts"
                 ] as const;
                 const key = settingKeys[index];
                 return (
                 <div key={notification.title} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">{notification.desc}</p>
                  </div>
                   <Switch 
                     checked={(settings as any)?.[key] ?? true}
                     onCheckedChange={(checked) => updateSettings.mutate({ [key]: checked })}
                   />
                </div>
               )})}
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
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Apps included</span>
                  <span className="font-medium">Unlimited</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Posts per month</span>
                  <span className="font-medium">500</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platforms</span>
                  <span className="font-medium">All</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}