import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ExternalLink, RefreshCw, Plus, FileText, Copy, CheckCircle2, Loader2, Trash2 } from "lucide-react";
import {
  useGrants, useGrantApplications, useDiscoverGrants, useQualifyGrant,
  useGenerateApplication, useUpdateGrant, useUpdateApplication, useAddGrantManually,
} from "@/hooks/useGrants";
import { useApps } from "@/hooks/useApps";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function fitColor(score: number) {
  if (score >= 75) return "bg-success/15 text-success border-success/30";
  if (score >= 50) return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    new: "bg-info/15 text-info",
    qualified: "bg-success/15 text-success",
    applied: "bg-primary/15 text-primary",
    won: "bg-success/20 text-success",
    lost: "bg-muted text-muted-foreground",
    dismissed: "bg-muted text-muted-foreground",
    draft: "bg-info/15 text-info",
    approved: "bg-secondary/20 text-secondary-foreground",
    submitted: "bg-primary/15 text-primary",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

export default function Funding() {
  const { data: apps = [] } = useApps();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAppId && apps.length > 0) setSelectedAppId(apps[0].id);
  }, [apps, selectedAppId]);

  const { data: grants = [], isLoading } = useGrants(selectedAppId);
  const { data: applications = [] } = useGrantApplications(selectedAppId);
  const discover = useDiscoverGrants();
  const qualify = useQualifyGrant();
  const generate = useGenerateApplication();
  const updateGrant = useUpdateGrant();
  const updateApp = useUpdateApplication();
  const addManual = useAddGrantManually();
  const { toast } = useToast();

  const [openDraft, setOpenDraft] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newGrant, setNewGrant] = useState({ title: "", url: "", provider: "", deadline: "" });

  const opportunities = grants.filter(g => !["applied", "won", "lost", "dismissed"].includes(g.status));
  const drafts = applications.filter(a => a.status === "draft" || a.status === "approved");
  const submitted = applications.filter(a => ["submitted", "won", "lost"].includes(a.status));

  const openApp = applications.find(a => a.id === openDraft);

  const getItems = (a: any): Array<{ question: string; answer: string }> => {
    const j = a?.answers_json;
    if (j && typeof j === "object" && Array.isArray((j as any).items)) return (j as any).items;
    return [];
  };

  const handleApply = (app: any) => {
    const grant = app.grants;
    const items = getItems(app);
    const text = `${app.generated_pitch}\n\n---\n\n${items.map((q) => `Q: ${q.question}\n\n${q.answer}`).join("\n\n---\n\n")}`;
    navigator.clipboard.writeText(text);
    updateApp.mutate({ id: app.id, updates: { status: "submitted", submitted_at: new Date().toISOString() } });
    updateGrant.mutate({ id: grant.id, updates: { status: "applied" } });
    if (grant.url) window.open(grant.url, "_blank");
    toast({ title: "Application copied", description: "Paste it into the grant portal that just opened." });
    setOpenDraft(null);
  };

  return (
    <DashboardLayout title="Funding">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Funding</h1>
            <p className="text-sm text-muted-foreground">Grants and applications for the selected app.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedAppId ?? ""} onValueChange={(v) => setSelectedAppId(v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Choose an app" /></SelectTrigger>
              <SelectContent>
                {apps.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!selectedAppId}><Plus className="mr-1.5 h-4 w-4" />Add manually</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add a grant</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Title *</Label><Input value={newGrant.title} onChange={e => setNewGrant({ ...newGrant, title: e.target.value })} /></div>
                  <div><Label>Application URL *</Label><Input value={newGrant.url} onChange={e => setNewGrant({ ...newGrant, url: e.target.value })} placeholder="https://..." /></div>
                  <div><Label>Provider</Label><Input value={newGrant.provider} onChange={e => setNewGrant({ ...newGrant, provider: e.target.value })} /></div>
                  <div><Label>Deadline</Label><Input type="date" value={newGrant.deadline} onChange={e => setNewGrant({ ...newGrant, deadline: e.target.value })} /></div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => selectedAppId && addManual.mutate(
                      { ...newGrant, deadline: newGrant.deadline || null, app_id: selectedAppId },
                      { onSuccess: () => { setAddOpen(false); setNewGrant({ title: "", url: "", provider: "", deadline: "" }); } }
                    )}
                    disabled={!newGrant.title || !newGrant.url || !selectedAppId || addManual.isPending}
                  >Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => selectedAppId && discover.mutate(selectedAppId)} disabled={!selectedAppId || discover.isPending}>
              {discover.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              Discover grants
            </Button>
          </div>
        </div>

        {apps.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Add an app first to discover funding tailored to it.</CardContent></Card>
        )}

        <Tabs defaultValue="opportunities">
          <TabsList>
            <TabsTrigger value="opportunities">Opportunities ({opportunities.length})</TabsTrigger>
            <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
            <TabsTrigger value="pipeline">Pipeline ({submitted.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="opportunities" className="mt-4 space-y-3">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && opportunities.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">No grants yet</p>
                  <p className="mb-4 text-sm text-muted-foreground">Run discovery to pull in matching German & EU grants.</p>
                  <Button onClick={() => selectedAppId && discover.mutate(selectedAppId)} disabled={!selectedAppId || discover.isPending}>
                    {discover.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
                    Discover grants
                  </Button>
                </CardContent>
              </Card>
            )}
            {opportunities.map(g => {
              const hasApp = applications.some(a => a.grant_id === g.id);
              return (
                <Card key={g.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">{g.title}</CardTitle>
                        <CardDescription className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                          {g.provider && <span>{g.provider}</span>}
                          {g.country && <span>· {g.country}</span>}
                          {g.funding_amount && <span>· {g.funding_amount}</span>}
                          {g.deadline && <span>· Deadline {format(new Date(g.deadline), "MMM d, yyyy")}</span>}
                        </CardDescription>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.fit_score > 0 && (
                          <Badge variant="outline" className={fitColor(g.fit_score)}>Fit {g.fit_score}</Badge>
                        )}
                        <Badge variant="outline" className={statusColor(g.status)}>{g.status}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {g.eligibility_summary && <p className="text-sm text-muted-foreground line-clamp-3">{g.eligibility_summary}</p>}
                    {g.fit_reasoning && <p className="text-xs text-muted-foreground border-l-2 border-info/40 pl-2"><span className="font-medium text-foreground">AI fit:</span> {g.fit_reasoning}</p>}
                    {g.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {g.tags.slice(0, 5).map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {!g.enriched_at && (
                        <Button size="sm" variant="outline" onClick={() => qualify.mutate(g.id)} disabled={qualify.isPending}>
                          {qualify.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                          Analyze fit
                        </Button>
                      )}
                      {!hasApp ? (
                        <Button size="sm" onClick={() => generate.mutate(g.id)} disabled={generate.isPending}>
                          {generate.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-1.5 h-3.5 w-3.5" />}
                          Generate application
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => {
                          const a = applications.find(x => x.grant_id === g.id);
                          if (a) setOpenDraft(a.id);
                        }}><FileText className="mr-1.5 h-3.5 w-3.5" />Open draft</Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <a href={g.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Source</a>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => updateGrant.mutate({ id: g.id, updates: { status: "dismissed" } })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="drafts" className="mt-4 space-y-3">
            {drafts.length === 0 && <p className="text-sm text-muted-foreground">No drafts yet. Generate an application from the Opportunities tab.</p>}
            {drafts.map(a => (
              <Card key={a.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{a.grants?.title}</CardTitle>
                    <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                  </div>
                  <CardDescription className="text-xs">{a.grants?.provider}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{a.generated_pitch}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => setOpenDraft(a.id)}>Review & apply</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="pipeline" className="mt-4 space-y-3">
            {submitted.length === 0 && <p className="text-sm text-muted-foreground">Nothing submitted yet.</p>}
            {submitted.map(a => (
              <Card key={a.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{a.grants?.title}</CardTitle>
                    <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {a.grants?.provider}{a.submitted_at && ` · Submitted ${format(new Date(a.submitted_at), "MMM d, yyyy")}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateApp.mutate({ id: a.id, updates: { status: "won" } })}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark won
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => updateApp.mutate({ id: a.id, updates: { status: "lost" } })}>Mark lost</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Draft viewer */}
        <Dialog open={!!openDraft} onOpenChange={(o) => !o && setOpenDraft(null)}>
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{openApp?.grants?.title}</DialogTitle></DialogHeader>
            {openApp && (
              <div className="space-y-4">
                <div>
                  <Label className="mb-1 block">Pitch</Label>
                  <Textarea
                    value={openApp.generated_pitch ?? ""}
                    onChange={(e) => updateApp.mutate({ id: openApp.id, updates: { generated_pitch: e.target.value } })}
                    rows={6}
                  />
                </div>
                {getItems(openApp).map((q, i: number) => (
                  <div key={i}>
                    <Label className="mb-1 block text-xs font-semibold">{q.question}</Label>
                    <Textarea
                      defaultValue={q.answer}
                      rows={4}
                      onBlur={(e) => {
                        const items = [...getItems(openApp)];
                        items[i] = { ...items[i], answer: e.target.value };
                        updateApp.mutate({ id: openApp.id, updates: { answers_json: { items } } });
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            <DialogFooter className="flex-wrap gap-2">
              <Button variant="outline" onClick={() => {
                if (!openApp) return;
                const text = `${openApp.generated_pitch}\n\n${getItems(openApp).map((q) => `${q.question}\n\n${q.answer}`).join("\n\n")}`;
                navigator.clipboard.writeText(text);
                toast({ title: "Copied to clipboard" });
              }}><Copy className="mr-1.5 h-4 w-4" />Copy</Button>
              <Button onClick={() => openApp && handleApply(openApp)}>
                <ExternalLink className="mr-1.5 h-4 w-4" />Approve & apply
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
