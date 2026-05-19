import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useApps } from "@/hooks/useApps";
import { useLeads, useConversions, useClickEvents, useAddConversion, useUpdateLead } from "@/hooks/useLeads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DollarSign, Users, MousePointerClick, TrendingUp, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export default function Revenue() {
  const { data: apps = [] } = useApps();
  const [appFilter, setAppFilter] = useState<string>("all");
  const { data: leads = [] } = useLeads(appFilter);
  const { data: conversions = [] } = useConversions(appFilter);
  const { data: clicks = [] } = useClickEvents(appFilter);
  const addConversion = useAddConversion();
  const updateLead = useUpdateLead();

  const totalRevenue = useMemo(() => conversions.reduce((sum, c) => sum + Number(c.amount || 0), 0), [conversions]);
  const totalLeads = leads.length;
  const totalClicks = clicks.length;
  const conversionRate = totalLeads > 0 ? ((conversions.length / totalLeads) * 100).toFixed(1) : "0";

  const [convDialogLead, setConvDialogLead] = useState<string | null>(null);
  const [convAmount, setConvAmount] = useState("");
  const [convNotes, setConvNotes] = useState("");

  const handleRecordConversion = (leadId: string, appId: string, sourceContentId: string | null) => {
    if (!convAmount || isNaN(Number(convAmount))) return;
    addConversion.mutate(
      { lead_id: leadId, app_id: appId, source_content_id: sourceContentId, amount: Number(convAmount), notes: convNotes },
      {
        onSuccess: () => {
          setConvDialogLead(null);
          setConvAmount("");
          setConvNotes("");
        },
      }
    );
  };

  const appName = (id: string) => apps.find((a) => a.id === id)?.name || "—";

  return (
    <DashboardLayout title="Revenue">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Revenue</h1>
            <p className="text-sm text-muted-foreground">Track leads, conversions, and revenue from your content.</p>
          </div>
          <Select value={appFilter} onValueChange={setAppFilter}>
            <SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All apps</SelectItem>
              {apps.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground">Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalClicks}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground">Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{totalLeads}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversions.length}</div>
              <div className="text-xs text-muted-foreground">{conversionRate}% rate</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs text-muted-foreground">Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div></CardContent>
          </Card>
        </div>

        {/* Leads — List + Pipeline tabs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No leads yet. Share tracked links from your posts to capture leads on your landing pages.
              </div>
            ) : (
              <Tabs defaultValue="pipeline">
                <TabsList>
                  <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                </TabsList>

                <TabsContent value="pipeline" className="mt-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {(["new", "contacted", "qualified", "converted"] as const).map((stage) => {
                      const stageLeads = leads.filter((l) => l.status === stage);
                      const nextStage: Record<string, string | null> = {
                        new: "contacted", contacted: "qualified", qualified: "converted", converted: null,
                      };
                      return (
                        <div key={stage} className="rounded-lg border bg-muted/30 p-2">
                          <div className="flex items-center justify-between px-1 pb-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{stage}</span>
                            <Badge variant="secondary" className="text-[10px]">{stageLeads.length}</Badge>
                          </div>
                          <div className="space-y-2">
                            {stageLeads.length === 0 ? (
                              <div className="rounded-md border border-dashed bg-background/50 p-3 text-center text-[11px] text-muted-foreground">Empty</div>
                            ) : stageLeads.map((lead) => (
                              <div key={lead.id} className="rounded-md border bg-background p-2.5 shadow-sm">
                                <div className="text-sm font-medium truncate">{lead.email}</div>
                                {lead.name && <div className="text-[11px] text-muted-foreground truncate">{lead.name}</div>}
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-[10px] text-muted-foreground">{appName(lead.app_id)}</span>
                                  <span className="text-[10px] text-muted-foreground">{lead.lead_score}</span>
                                </div>
                                <div className="mt-2 flex gap-1">
                                  {stage !== "converted" && nextStage[stage] && nextStage[stage] !== "converted" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-6 px-2 text-[11px] flex-1"
                                      onClick={() => updateLead.mutate({ id: lead.id, status: nextStage[stage]! })}
                                    >
                                      → {nextStage[stage]}
                                    </Button>
                                  )}
                                  {stage !== "converted" && (
                                    <Button
                                      size="sm"
                                      className="h-6 px-2 text-[11px] flex-1"
                                      onClick={() => setConvDialogLead(lead.id)}
                                    >
                                      Convert
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="list" className="mt-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>App</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Captured</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.email}{lead.name ? <div className="text-xs text-muted-foreground">{lead.name}</div> : null}</TableCell>
                            <TableCell>{appName(lead.app_id)}</TableCell>
                            <TableCell><Badge variant={lead.status === "converted" ? "default" : "secondary"}>{lead.status}</Badge></TableCell>
                            <TableCell>{lead.lead_score}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              {lead.status !== "converted" && (
                                <Button size="sm" variant="outline" onClick={() => setConvDialogLead(lead.id)}>Mark converted</Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Recent conversions */}
        {conversions.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Recent conversions</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions.slice(0, 10).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{appName(c.app_id)}</TableCell>
                      <TableCell className="font-medium">${Number(c.amount).toFixed(2)} {c.currency}</TableCell>
                      <TableCell><Badge variant="outline">{c.source}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Set up landing pages</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Each app has a public landing page that captures leads. Configure the slug, headline and CTA in the app settings.</p>
            <Button asChild variant="outline" size="sm"><Link to="/apps">Manage apps <ExternalLink className="ml-1 h-3 w-3" /></Link></Button>
          </CardContent>
        </Card>

        {/* Global conversion dialog */}
        <Dialog open={!!convDialogLead} onOpenChange={(o) => !o && setConvDialogLead(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Record conversion</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Amount (USD)</Label>
                <Input type="number" min="0" step="0.01" value={convAmount} onChange={(e) => setConvAmount(e.target.value)} placeholder="49.00" />
              </div>
              <div className="space-y-1">
                <Label>Notes (optional)</Label>
                <Input value={convNotes} onChange={(e) => setConvNotes(e.target.value)} placeholder="Plan, deal name…" />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  const lead = leads.find((l) => l.id === convDialogLead);
                  if (lead) handleRecordConversion(lead.id, lead.app_id, lead.source_content_id);
                }}
                disabled={addConversion.isPending}
              >Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
