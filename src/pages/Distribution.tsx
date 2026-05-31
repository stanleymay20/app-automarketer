import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Radio, Users, Mic, CalendarDays, Sparkles, Loader2, ExternalLink,
  Bookmark, Play, X, Send, Check, MessageSquare, Lightbulb,
} from "lucide-react";
import {
  useDistribution, useDiscoverDistribution, useDistributionAction, useDistributionActionsFor,
  type TargetType, type DistTarget, type DistAction,
} from "@/hooks/useDistribution";
import { useApps } from "@/hooks/useApps";

const TYPE_META: Record<TargetType, { label: string; icon: any; blurb: string; genAction: DistAction; genLabel: string }> = {
  channel:    { label: "Channels",    icon: Radio,        blurb: "Where your audience already scrolls.",                 genAction: "generate_channel_campaign",    genLabel: "Channel campaign" },
  community:  { label: "Communities", icon: Users,        blurb: "Specific groups where your persona is active.",         genAction: "generate_community_outreach",  genLabel: "Community post" },
  influencer: { label: "Influencers", icon: Mic,          blurb: "Creators, newsletters and podcasts with real reach.",   genAction: "generate_influencer_outreach", genLabel: "Outreach DM" },
  event:      { label: "Events",      icon: CalendarDays, blurb: "Conferences and meetups your audience attends.",        genAction: "generate_event_strategy",      genLabel: "Event playbook" },
};

function Bar({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${invert ? "bg-destructive/70" : "bg-primary"}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function TargetCard({ t, onOpen }: { t: DistTarget; onOpen: (t: DistTarget) => void }) {
  const action = useDistributionAction();
  const meta = TYPE_META[t.target_type];
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {t.platform && <Badge variant="outline" className="text-[10px] uppercase">{t.platform}</Badge>}
              <CardTitle className="truncate text-base">{t.name}</CardTitle>
            </div>
            {t.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.description}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold leading-none text-primary">{t.distribution_score}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">score</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Bar label="Audience Fit" value={t.audience_fit} />
          <Bar label="Reach" value={t.reach_potential} />
          <Bar label="Competition" value={t.competition_level} invert />
          <Bar label="Cost (cheap→)" value={t.cost_score} />
          <Bar label="Conversion" value={t.conversion_potential} />
        </div>
        {t.rationale && <p className="rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">{t.rationale}</p>}
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
          {t.status !== "new" && <Badge variant="secondary" className="capitalize">{t.status}</Badge>}
          {t.event_date && <Badge variant="outline">{new Date(t.event_date).toLocaleDateString()}</Badge>}
          {t.clicks_count > 0 && <span>{t.clicks_count} clicks</span>}
          {t.conversions_count > 0 && <span>· {t.conversions_count} conv</span>}
          {t.revenue_attributed > 0 && <span>· ${Number(t.revenue_attributed).toFixed(0)}</span>}
          {t.url && (
            <a href={t.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
              Visit <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => onOpen(t)} className="gap-1">
            <Sparkles className="h-3.5 w-3.5" /> {meta.genLabel}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => action.mutate({ target_id: t.id, action: "save" })}>
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => action.mutate({ target_id: t.id, action: "activate" })}>
            <Play className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => action.mutate({ target_id: t.id, action: "dismiss" })}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function GenerateDialog({ target, onClose }: { target: DistTarget | null; onClose: () => void }) {
  const action = useDistributionAction();
  const { data: history } = useDistributionActionsFor(target?.id);
  if (!target) return null;
  const meta = TYPE_META[target.target_type];
  const drafts = (history ?? []).filter((a: any) => a.body);

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{target.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-1" disabled={action.isPending} onClick={() => action.mutate({ target_id: target.id, action: meta.genAction })}>
              {action.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate {meta.genLabel}
            </Button>
          </div>
          <div className="max-h-80 space-y-3 overflow-y-auto">
            {drafts.length === 0 && (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No drafts yet. Click Generate.
              </p>
            )}
            {drafts.map((d: any) => (
              <div key={d.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium capitalize">{d.action_type.replace(/_/g, " ")}</span>
                  <span>{new Date(d.created_at).toLocaleString()}</span>
                </div>
                {d.subject && <p className="mb-1 text-sm font-medium">Subject: {d.subject}</p>}
                <Textarea defaultValue={d.body} className="min-h-32 text-xs" />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => action.mutate({ target_id: target.id, action: "mark_contacted" })}>
              <Send className="mr-1 h-3.5 w-3.5" /> Contacted
            </Button>
            <Button size="sm" variant="outline" onClick={() => action.mutate({ target_id: target.id, action: "mark_converted" })}>
              <Check className="mr-1 h-3.5 w-3.5" /> Converted
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Distribution() {
  const { data: apps } = useApps();
  const [appId, setAppId] = useState<string | undefined>(undefined);
  const { data, isLoading } = useDistribution(appId);
  const discover = useDiscoverDistribution();
  const [open, setOpen] = useState<DistTarget | null>(null);
  const [tab, setTab] = useState<TargetType | "all">("all");

  const targets = data?.targets ?? [];
  const recs = data?.recommendations ?? [];

  const grouped = useMemo(() => {
    const g: Record<string, DistTarget[]> = { all: targets };
    for (const t of Object.keys(TYPE_META) as TargetType[]) g[t] = targets.filter((x) => x.target_type === t);
    return g;
  }, [targets]);

  const memory = useMemo(() => ({
    discovered: targets.length,
    saved: targets.filter((t) => ["saved", "active", "contacted", "converted"].includes(t.status)).length,
    active: targets.filter((t) => t.status === "active").length,
    contacted: targets.filter((t) => t.contacted_at).length,
    converted: targets.filter((t) => t.conversions_count > 0).length,
    revenue: targets.reduce((s, t) => s + Number(t.revenue_attributed ?? 0), 0),
  }), [targets]);

  const list = tab === "all" ? targets : grouped[tab];

  return (
    <DashboardLayout title="Distribution Intelligence">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Distribution Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              Where your audience already exists — and how to reach them.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={appId ?? ""}
              onChange={(e) => setAppId(e.target.value || undefined)}
            >
              <option value="">All apps</option>
              {(apps ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <Button onClick={() => discover.mutate({ appId })} disabled={discover.isPending} className="gap-1">
              {discover.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Discover distribution
            </Button>
          </div>
        </div>

        {/* Learning loop bar */}
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-6">
            {[
              { k: "Discovered", v: memory.discovered },
              { k: "Saved", v: memory.saved },
              { k: "Active", v: memory.active },
              { k: "Contacted", v: memory.contacted },
              { k: "Converted", v: memory.converted },
              { k: "Revenue", v: `$${memory.revenue.toFixed(0)}` },
            ].map((m) => (
              <div key={m.k} className="text-center">
                <div className="text-xl font-bold">{m.v}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.k}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        {recs.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="h-4 w-4 text-primary" /> AI recommendations
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {recs.map((r) => (
                <div key={r.id} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={r.basis === "attribution" ? "default" : r.basis === "signal" ? "secondary" : "outline"} className="text-[10px] capitalize">
                      {r.basis}
                    </Badge>
                    {r.related_platform && <Badge variant="outline" className="text-[10px] uppercase">{r.related_platform}</Badge>}
                    <span className="ml-auto text-[10px] text-muted-foreground">{r.confidence}% conf</span>
                  </div>
                  <p className="text-sm">{r.insight}</p>
                  {r.recommendation && <p className="mt-1 text-xs text-muted-foreground">→ {r.recommendation}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="all">All ({targets.length})</TabsTrigger>
            {(Object.keys(TYPE_META) as TargetType[]).map((t) => {
              const M = TYPE_META[t]; const Icon = M.icon;
              return (
                <TabsTrigger key={t} value={t} className="gap-1">
                  <Icon className="h-3.5 w-3.5" />
                  {M.label} ({grouped[t]?.length ?? 0})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {tab !== "all" && (
              <p className="mb-3 text-sm text-muted-foreground">{TYPE_META[tab as TargetType].blurb}</p>
            )}
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : list.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No distribution targets yet. Click <b>Discover distribution</b> to map channels, communities, influencers and events for your audience.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((t) => <TargetCard key={t.id} t={t} onOpen={setOpen} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <GenerateDialog target={open} onClose={() => setOpen(null)} />
    </DashboardLayout>
  );
}
