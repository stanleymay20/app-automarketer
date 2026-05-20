import { useEffect, useState } from "react";
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
import { Sparkles, Copy, ExternalLink, Loader2, Globe, Plus, X } from "lucide-react";

type Feature = { title: string; description: string; icon?: string };
type ProofItem = { kind: "quote" | "stat"; quote?: string; author?: string; role?: string; value?: string; label?: string };
type Objection = { question: string; answer: string };

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
  const [brandColor, setBrandColor] = useState("#0f172a");
  const [features, setFeatures] = useState<Feature[]>([]);
  const [proof, setProof] = useState<ProofItem[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);

  useEffect(() => {
    if (!app) return;
    setEnabled(app.landing_enabled ?? true);
    setSlug(app.landing_slug || "");
    setHeadline(app.landing_headline || "");
    setSubheadline(app.landing_subheadline || "");
    setCta(app.landing_cta_label || "Get early access");
    setBrandColor((app as any).landing_brand_color || "#0f172a");
    setFeatures(((app as any).landing_features as Feature[]) || []);
    setProof(((app as any).landing_proof as ProofItem[]) || []);
    setObjections(((app as any).landing_objections as Objection[]) || []);
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
      setBrandColor(a.landing_brand_color || "#0f172a");
      setFeatures(a.landing_features || []);
      setProof(a.landing_proof || []);
      setObjections(a.landing_objections || []);
      toast({ title: "Landing page generated", description: "Premium layout with persona-aware copy." });
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
      landing_brand_color: brandColor || null,
      landing_features: features as any,
      landing_proof: proof as any,
      landing_objections: objections as any,
    } as any);
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
            <p className="text-sm text-muted-foreground">Persona-aware page with features, proof, and objections — built to convert.</p>
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

        {/* Hero copy */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Hero</CardTitle></CardHeader>
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>CTA button</Label>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={40} />
              </div>
              <div className="space-y-1.5">
                <Label>Brand color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-12 rounded border border-input" />
                  <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} maxLength={7} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Features ({features.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setFeatures([...features, { title: "", description: "", icon: "check" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {features.length === 0 && <p className="text-xs text-muted-foreground">Click Generate to populate, or add manually.</p>}
            {features.map((f, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Feature {i + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => setFeatures(features.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Input value={f.title} placeholder="Title" onChange={(e) => {
                  const next = [...features]; next[i] = { ...f, title: e.target.value }; setFeatures(next);
                }} />
                <Textarea value={f.description} placeholder="Description" rows={2} onChange={(e) => {
                  const next = [...features]; next[i] = { ...f, description: e.target.value }; setFeatures(next);
                }} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Social proof */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Social proof ({proof.length})</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setProof([...proof, { kind: "quote", quote: "", author: "", role: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Quote
              </Button>
              <Button size="sm" variant="outline" onClick={() => setProof([...proof, { kind: "stat", value: "", label: "" }])}>
                <Plus className="h-3 w-3 mr-1" /> Stat
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {proof.map((p, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="text-[10px]">{p.kind}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => setProof(proof.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                {p.kind === "quote" ? (
                  <>
                    <Textarea value={p.quote || ""} placeholder="Quote" rows={2} onChange={(e) => {
                      const next = [...proof]; next[i] = { ...p, quote: e.target.value }; setProof(next);
                    }} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={p.author || ""} placeholder="Author" onChange={(e) => {
                        const next = [...proof]; next[i] = { ...p, author: e.target.value }; setProof(next);
                      }} />
                      <Input value={p.role || ""} placeholder="Role" onChange={(e) => {
                        const next = [...proof]; next[i] = { ...p, role: e.target.value }; setProof(next);
                      }} />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={p.value || ""} placeholder="2.3x" onChange={(e) => {
                      const next = [...proof]; next[i] = { ...p, value: e.target.value }; setProof(next);
                    }} />
                    <Input value={p.label || ""} placeholder="more replies" onChange={(e) => {
                      const next = [...proof]; next[i] = { ...p, label: e.target.value }; setProof(next);
                    }} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Objections */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Objections ({objections.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setObjections([...objections, { question: "", answer: "" }])}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {objections.map((o, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Q&A {i + 1}</span>
                  <Button size="sm" variant="ghost" onClick={() => setObjections(objections.filter((_, j) => j !== i))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <Input value={o.question} placeholder="Question" onChange={(e) => {
                  const next = [...objections]; next[i] = { ...o, question: e.target.value }; setObjections(next);
                }} />
                <Textarea value={o.answer} placeholder="Answer" rows={2} onChange={(e) => {
                  const next = [...objections]; next[i] = { ...o, answer: e.target.value }; setObjections(next);
                }} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="sticky bottom-4 bg-background/95 backdrop-blur border rounded-lg p-3 flex justify-end gap-2 shadow-lg">
          {publicUrl && (
            <Button variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1" /> Preview</a>
            </Button>
          )}
          <Button onClick={handleSave} disabled={updateApp.isPending}>
            {updateApp.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
