import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApps, useUpdateApp } from "@/hooks/useApps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Copy, ExternalLink, Loader2, Globe } from "lucide-react";

export default function AppLanding() {
  const { id } = useParams<{ id: string }>();
  const { data: apps = [] } = useApps();
  const app = apps.find((a) => a.id === id);
  const updateApp = useUpdateApp();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const [enabled, setEnabled] = useState(true);
  const [slug, setSlug] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [cta, setCta] = useState("");

  useEffect(() => {
    if (!app) return;
    setEnabled(app.landing_enabled ?? true);
    setSlug(app.landing_slug || "");
    setHeadline(app.landing_headline || "");
    setSubheadline(app.landing_subheadline || "");
    setCta(app.landing_cta_label || "Get early access");
  }, [app?.id]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = slug ? `${origin}/lp/${slug}` : "";

  const copy = (val: string, label: string) => {
    navigator.clipboard.writeText(val);
    toast({ title: `${label} copied` });
  };

  const handleGenerate = async () => {
    if (!app) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-copy", {
        body: { app_id: app.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const a = data.app;
      setEnabled(true);
      setSlug(a.landing_slug || "");
      setHeadline(a.landing_headline || "");
      setSubheadline(a.landing_subheadline || "");
      setCta(a.landing_cta_label || "Get early access");
      toast({ title: "Landing page generated" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    if (!app) return;
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
    updateApp.mutate({
      id: app.id,
      landing_enabled: enabled,
      landing_slug: cleanSlug || null,
      landing_headline: headline.trim() || null,
      landing_subheadline: subheadline.trim() || null,
      landing_cta_label: cta.trim() || "Get early access",
    });
  };

  if (!app) {
    return (
      <DashboardLayout title="Landing Page">
        <p className="text-muted-foreground">App not found. <Link to="/apps" className="text-primary underline">Back to apps</Link></p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Landing Page">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{app.name} — Landing</h1>
            <p className="text-sm text-muted-foreground">A hosted page that captures leads and attributes them to your posts.</p>
          </div>
          <Button onClick={handleGenerate} disabled={busy} className="gap-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Writing…" : "Generate with AI"}
          </Button>
        </div>

        {/* Public URL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2"><Globe className="h-4 w-4" /> Public URL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <span className="text-sm">{enabled ? "Live" : "Disabled"}</span>
              {enabled && <Badge variant="secondary">Capturing leads</Badge>}
            </div>
            {publicUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded break-all flex-1 min-w-0">{publicUrl}</code>
                <Button size="sm" variant="outline" onClick={() => copy(publicUrl, "URL")}><Copy className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" asChild>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Set a slug or click Generate to create one.</p>
            )}
          </CardContent>
        </Card>

        {/* Copy */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Page content</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-app" />
            </div>
            <div className="space-y-1.5">
              <Label>Headline</Label>
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label>Subheadline</Label>
              <Textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} rows={2} maxLength={240} />
            </div>
            <div className="space-y-1.5">
              <Label>CTA button</Label>
              <Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={40} />
            </div>
            <Button onClick={handleSave} disabled={updateApp.isPending}>Save</Button>
          </CardContent>
        </Card>

        {/* How tracked links work */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Attribution</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Every published post gets a unique tracked link. Clicks land here and get attributed to that post for lead and revenue reporting.</p>
            <p>To record revenue, post a webhook to <code className="text-xs bg-muted px-1 py-0.5 rounded">/functions/v1/conversion-webhook</code> with the lead email and amount.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
