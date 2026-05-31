import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Building2, Landmark, Handshake, TrendingUp, Users, Sparkles, ExternalLink,
  Bookmark, Eye, X, MessageSquare, Send, Check, Loader2,
} from "lucide-react";
import { useProspects, useDiscoverProspects, useProspectAction, useProspectActions, type ProspectCategory, type Prospect } from "@/hooks/useProspects";
import { useApps } from "@/hooks/useApps";

const CATEGORY_META: Record<ProspectCategory, { label: string; icon: any; blurb: string }> = {
  customer:  { label: "Customers",  icon: Building2, blurb: "Organizations that match your ICP and persona." },
  grant:     { label: "Grants",     icon: Landmark,  blurb: "Open funding programs, accelerators, innovation grants." },
  partner:   { label: "Partners",   icon: Handshake, blurb: "Distributors, agencies, consultancies, complementary tools." },
  investor:  { label: "Investors",  icon: TrendingUp,blurb: "Angels, accelerators and VCs that match your stage." },
  community: { label: "Communities",icon: Users,     blurb: "Where your persona is already active and engaged." },
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ProspectCard({ p, onOpen }: { p: Prospect; onOpen: (p: Prospect) => void }) {
  const action = useProspectAction();
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{p.name}</CardTitle>
            {p.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-2xl font-bold leading-none text-primary">{p.prospect_score}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">score</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <ScoreBar label="Fit" value={p.fit_score} />
          <ScoreBar label="Opportunity" value={p.opportunity_score} />
          <ScoreBar label="Urgency" value={p.urgency_score} />
          <ScoreBar label="Reachability" value={p.reachability_score} />
        </div>
        {p.match_reason && (
          <p className="rounded-md bg-muted/50 p-2 text-xs italic text-muted-foreground">{p.match_reason}</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {p.status !== "new" && <Badge variant="secondary" className="capitalize">{p.status}</Badge>}
          {p.deadline && <Badge variant="outline">Closes {new Date(p.deadline).toLocaleDateString()}</Badge>}
          {p.url && (
            <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline">
              Visit <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" onClick={() => onOpen(p)} className="gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Outreach
          </Button>
          <Button size="sm" variant="outline" onClick={() => action.mutate({ prospect_id: p.id, action: "generate_campaign" })}>
            Campaign
          </Button>
          <Button size="sm" variant="ghost" onClick={() => action.mutate({ prospect_id: p.id, action: "save" })}>
            <Bookmark className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => action.mutate({ prospect_id: p.id, action: "watch" })}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => action.mutate({ prospect_id: p.id, action: "dismiss" })}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function OutreachDialog({ prospect, onClose }: { prospect: Prospect | null; onClose: () => void }) {
  const action = useProspectAction();
  const { data: history } = useProspectActions(prospect?.id);
  const [channel, setChannel] = useState<string>("linkedin_message");

  if (!prospect) return null;
  const channels = prospect.category === "grant"
    ? [{ v: "grant_application", l: "Grant draft" }]
    : prospect.category === "partner"
    ? [{ v: "partnership_pitch", l: "Partnership pitch" }, { v: "email", l: "Email" }]
    : [{ v: "linkedin_message", l: "LinkedIn DM" }, { v: "email", l: "Email" }];

  const drafts = (history ?? []).filter((a: any) => a.body);

  return (
    <Dialog open={!!prospect} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{prospect.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {channels.map((c) => (
              <Button key={c.v} size="sm" variant={channel === c.v ? "default" : "outline"} onClick={() => setChannel(c.v)}>
                {c.l}
              </Button>
            ))}
            <Button
              size="sm"
              className="ml-auto gap-1"
              disabled={action.isPending}
              onClick={() => action.mutate({ prospect_id: prospect.id, action: "generate_outreach", channel })}
            >
              {action.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Generate
            </Button>
          </div>

          <div className="max-h-80 space-y-3 overflow-y-auto">
            {drafts.length === 0 && (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No drafts yet. Choose a channel and click Generate.
              </p>
            )}
            {drafts.map((d: any) => (
              <div key={d.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-medium capitalize">{d.channel ?? d.action_type}</span>
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
            <Button size="sm" variant="outline" onClick={() => action.mutate({ prospect_id: prospect.id, action: "mark_contacted" })}>
              <Send className="mr-1 h-3.5 w-3.5" /> Mark contacted
            </Button>
            <Button size="sm" variant="outline" onClick={() => action.mutate({ prospect_id: prospect.id, action: "mark_responded" })}>
              <MessageSquare className="mr-1 h-3.5 w-3.5" /> Responded
            </Button>
            <Button size="sm" variant="outline" onClick={() => action.mutate({ prospect_id: prospect.id, action: "mark_converted" })}>
              <Check className="mr-1 h-3.5 w-3.5" /> Converted
            </Button>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Prospects() {
  const { data: apps } = useApps();
  const [appId, setAppId] = useState<string | undefined>(undefined);
  const { data: prospects = [], isLoading } = useProspects(appId);
  const discover = useDiscoverProspects();
  const [open, setOpen] = useState<Prospect | null>(null);
  const [tab, setTab] = useState<ProspectCategory | "all">("all");

  const grouped = useMemo(() => {
    const g: Record<string, Prospect[]> = { all: prospects };
    for (const c of Object.keys(CATEGORY_META) as ProspectCategory[]) {
      g[c] = prospects.filter((p) => p.category === c);
    }
    return g;
  }, [prospects]);

  const memory = useMemo(() => {
    return {
      total: prospects.length,
      saved: prospects.filter((p) => ["saved", "watching"].includes(p.status)).length,
      contacted: prospects.filter((p) => p.contacted_at).length,
      responded: prospects.filter((p) => p.responded_at).length,
      converted: prospects.filter((p) => p.converted_at).length,
      revenue: prospects.reduce((s, p) => s + Number(p.revenue_attributed ?? 0), 0),
    };
  }, [prospects]);

  const list = tab === "all" ? prospects : grouped[tab];

  return (
    <DashboardLayout title="Prospects">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospects</h1>
            <p className="text-sm text-muted-foreground">
              Who you should talk to next — discovered from your audience, market signals, and learning loop.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={appId ?? ""}
              onChange={(e) => setAppId(e.target.value || undefined)}
            >
              <option value="">All apps</option>
              {(apps ?? []).map((a: any) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <Button onClick={() => discover.mutate({ appId })} disabled={discover.isPending} className="gap-1">
              {discover.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Discover prospects
            </Button>
          </div>
        </div>

        {/* Learning loop memory */}
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-6">
            {[
              { k: "Discovered", v: memory.total },
              { k: "Saved", v: memory.saved },
              { k: "Contacted", v: memory.contacted },
              { k: "Responded", v: memory.responded },
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto">
            <TabsTrigger value="all">All ({prospects.length})</TabsTrigger>
            {(Object.keys(CATEGORY_META) as ProspectCategory[]).map((c) => {
              const M = CATEGORY_META[c];
              const Icon = M.icon;
              return (
                <TabsTrigger key={c} value={c} className="gap-1">
                  <Icon className="h-3.5 w-3.5" />
                  {M.label} ({grouped[c]?.length ?? 0})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={tab} className="mt-4">
            {tab !== "all" && (
              <p className="mb-3 text-sm text-muted-foreground">{CATEGORY_META[tab as ProspectCategory].blurb}</p>
            )}
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : list.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                  <Sparkles className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No prospects yet. Click <b>Discover prospects</b> to generate matches based on your audience and market intelligence.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => <ProspectCard key={p.id} p={p} onOpen={setOpen} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <OutreachDialog prospect={open} onClose={() => setOpen(null)} />
    </DashboardLayout>
  );
}
