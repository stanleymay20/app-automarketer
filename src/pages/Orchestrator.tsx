import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useApps } from "@/hooks/useApps";
import { usePersonas, useJourneyStages, useMessagingAngles } from "@/hooks/useAudience";
import { useOrchestrateCampaign, useCampaignAssets, useRecentCampaigns } from "@/hooks/useOrchestrator";
import { Rocket, Sparkles, FileText, Image as ImageIcon, Video, Mail, Globe, Megaphone, Lightbulb } from "lucide-react";

const ASSET_GROUPS: { key: string; label: string; icon: any; types: string[] }[] = [
  { key: "posts", label: "Posts", icon: FileText, types: ["linkedin_post", "x_post"] },
  { key: "landing", label: "Landing pages", icon: Globe, types: ["landing_variant"] },
  { key: "briefs", label: "Creative briefs", icon: Lightbulb, types: ["creative_brief", "image_brief", "video_brief"] },
  { key: "outreach", label: "Outreach", icon: Mail, types: ["outreach_email", "lead_magnet"] },
  { key: "distribution", label: "Distribution", icon: Megaphone, types: ["distribution_plan"] },
];

const ICON_FOR_TYPE: Record<string, any> = {
  linkedin_post: FileText, x_post: FileText,
  landing_variant: Globe, lead_magnet: Mail, outreach_email: Mail,
  distribution_plan: Megaphone,
  creative_brief: Lightbulb, image_brief: ImageIcon, video_brief: Video,
};

export default function Orchestrator() {
  const { data: apps = [] } = useApps();
  const [appId, setAppId] = useState<string>("");
  const { data: personas = [] } = usePersonas(appId);
  const { data: stages = [] } = useJourneyStages(appId);
  const { data: angles = [] } = useMessagingAngles(appId);
  const [personaId, setPersonaId] = useState<string>("");
  const [stage, setStage] = useState<string>("");
  const [angle, setAngle] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);

  const orchestrate = useOrchestrateCampaign();
  const { data: assets = [] } = useCampaignAssets(activeCampaignId);
  const { data: recent = [] } = useRecentCampaigns();

  const groupedAssets = useMemo(() => {
    const map: Record<string, any[]> = {};
    ASSET_GROUPS.forEach(g => map[g.key] = []);
    assets.forEach((a: any) => {
      const grp = ASSET_GROUPS.find(g => g.types.includes(a.asset_type));
      if (grp) map[grp.key].push(a);
    });
    return map;
  }, [assets]);

  const launch = () => {
    if (!appId) return;
    orchestrate.mutate(
      {
        app_id: appId,
        persona_id: personaId || null,
        journey_stage: stage || null,
        messaging_angle: angle || null,
        goal: goal || null,
      },
      { onSuccess: (data) => setActiveCampaignId(data.campaign_id) }
    );
  };

  return (
    <DashboardLayout title="Orchestrator">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" /> Campaign Orchestrator
          </h1>
          <p className="text-sm text-muted-foreground">One brief → full campaign: posts, landing pages, creative briefs, outreach, distribution.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New campaign</CardTitle>
            <CardDescription>Pick the inputs. Everything else is generated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>App</Label>
                <Select value={appId} onValueChange={setAppId}>
                  <SelectTrigger><SelectValue placeholder="Choose an app" /></SelectTrigger>
                  <SelectContent>{apps.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Persona</Label>
                <Select value={personaId} onValueChange={setPersonaId} disabled={!appId}>
                  <SelectTrigger><SelectValue placeholder={personas.length ? "Optional" : "No personas yet"} /></SelectTrigger>
                  <SelectContent>{personas.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Journey stage</Label>
                <Select value={stage} onValueChange={setStage} disabled={!appId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{stages.map((s: any) => <SelectItem key={s.id} value={s.stage}>{s.stage}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Messaging angle</Label>
                <Select value={angle} onValueChange={setAngle} disabled={!appId}>
                  <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                  <SelectContent>{angles.map((a: any) => <SelectItem key={a.id} value={a.angle_name}>{a.angle_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Goal (optional)</Label>
              <Input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. 25 qualified demos from COO persona in healthcare" />
            </div>
            <Button onClick={launch} disabled={!appId || orchestrate.isPending} className="gap-2">
              <Sparkles className="h-4 w-4" />
              {orchestrate.isPending ? "Generating campaign…" : "Launch campaign"}
            </Button>
          </CardContent>
        </Card>

        {activeCampaignId && (
          <Card>
            <CardHeader>
              <CardTitle>Campaign sheet</CardTitle>
              <CardDescription>{assets.length} assets generated.</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="posts">
                <TabsList className="flex flex-wrap h-auto">
                  {ASSET_GROUPS.map(g => (
                    <TabsTrigger key={g.key} value={g.key} className="gap-1.5">
                      <g.icon className="h-3.5 w-3.5" />
                      {g.label}
                      <Badge variant="secondary" className="ml-1">{groupedAssets[g.key]?.length ?? 0}</Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
                {ASSET_GROUPS.map(g => (
                  <TabsContent key={g.key} value={g.key} className="space-y-3 mt-4">
                    {(groupedAssets[g.key] ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">No assets in this group.</p>
                    )}
                    {(groupedAssets[g.key] ?? []).map((a: any) => {
                      const Icon = ICON_FOR_TYPE[a.asset_type] ?? FileText;
                      return (
                        <Card key={a.id} className="border-l-4 border-l-primary/40">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">{a.asset_type.replace(/_/g, " ")}</span>
                            </div>
                            <div className="font-medium">{a.title}</div>
                            {a.body && <pre className="whitespace-pre-wrap text-sm text-foreground/90 font-sans">{a.body}</pre>}
                            {a.metadata && Object.keys(a.metadata).length > 0 && (
                              <details className="text-xs text-muted-foreground">
                                <summary className="cursor-pointer">Details</summary>
                                <pre className="whitespace-pre-wrap mt-2">{JSON.stringify(a.metadata, null, 2)}</pre>
                              </details>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {recent.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Recent campaigns</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recent.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCampaignId(c.id)}
                  className={`w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors ${activeCampaignId === c.id ? "bg-accent border-primary" : ""}`}
                >
                  <div className="font-medium text-sm">{c.campaign_name}</div>
                  <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
