import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Users, Target, Map, Lightbulb, RefreshCw } from "lucide-react";
import { useApps } from "@/hooks/useApps";
import {
  useAudienceProfile, useICPs, usePersonas, useJourneyStages,
  useMessagingAngles, useGenerateAudience,
} from "@/hooks/useAudience";
import { format } from "date-fns";

const STAGE_LABELS: Record<string, string> = {
  awareness: "Awareness",
  consideration: "Consideration",
  evaluation: "Evaluation",
  conversion: "Conversion",
  retention: "Retention",
};

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs text-foreground">
      {children}
    </span>
  );
}

function SectionEmpty({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <Icon className="h-8 w-8 opacity-50" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default function Audience() {
  const { data: apps = [] } = useApps();
  const [appId, setAppId] = useState<string | null>(null);

  useEffect(() => {
    if (!appId && apps.length) setAppId(apps[0].id);
  }, [apps, appId]);

  const { data: profile } = useAudienceProfile(appId || undefined);
  const { data: icps = [] } = useICPs(appId || undefined);
  const { data: personas = [] } = usePersonas(appId || undefined);
  const { data: journey = [] } = useJourneyStages(appId || undefined);
  const { data: angles = [] } = useMessagingAngles(appId || undefined);
  const generate = useGenerateAudience();

  const hasData = icps.length > 0 || personas.length > 0;
  // Only treat as "generating" if (a) mutation is currently in flight, OR
  // (b) status says generating AND it started within the last 3 minutes.
  // This prevents permanently-stuck rows from blocking the rebuild button.
  const startedAt = profile?.last_generated_at ? new Date(profile.last_generated_at).getTime() : 0;
  const recentlyStarted = profile?.status === "generating" && Date.now() - startedAt < 3 * 60_000 && startedAt > 0;
  const isGenerating = generate.isPending || recentlyStarted;
  const previousFailed = profile?.status === "failed" && !generate.isPending;

  return (
    <DashboardLayout title="Audience">
      <div className="space-y-6">
        {/* Header */}
        <Card className="shadow-card border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Audience Intelligence</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Build the strategy that powers every campaign — who buys, why, and what to say.
              </p>
              {profile?.last_generated_at && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last built {format(new Date(profile.last_generated_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {apps.length > 0 && (
                <Select value={appId || ""} onValueChange={setAppId}>
                  <SelectTrigger className="w-full sm:w-56">
                    <SelectValue placeholder="Select app" />
                  </SelectTrigger>
                  <SelectContent>
                    {apps.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button
                onClick={() => appId && generate.mutate(appId)}
                disabled={!appId || isGenerating}
                className="bg-gradient-to-r from-primary to-secondary text-primary-foreground"
              >
                {isGenerating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Building…</>
                ) : hasData ? (
                  <><RefreshCw className="mr-2 h-4 w-4" /> Rebuild</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Build my audience</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {!appId && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            Create an app first to build its audience.
          </CardContent></Card>
        )}

        {appId && !hasData && !isGenerating && (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground/60" />
              <h3 className="font-display text-lg font-semibold">No audience yet</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Tap <strong>Build my audience</strong> above. The AI will research your market and generate
                your ICPs, personas, customer journey, and messaging angles in about a minute.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ICPs */}
        {icps.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Ideal Customer Profiles</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {icps.map((icp) => (
                <Card key={icp.id} className="shadow-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{icp.segment}</CardTitle>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {icp.company_size && <Chip>{icp.company_size}</Chip>}
                      {icp.industry && <Chip>{icp.industry}</Chip>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {icp.signals?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Buying signals</p>
                        <ul className="ml-4 list-disc space-y-1 text-foreground">
                          {icp.signals.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {icp.notes && <p className="text-muted-foreground">{icp.notes}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Personas */}
        {personas.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Buyer Personas</h3>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {personas.map((p) => (
                <Card key={p.id} className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{p.title}</CardTitle>
                    {p.company_size && (
                      <CardDescription>{p.company_size}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {p.pains?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Pains</p>
                        <ul className="ml-4 list-disc space-y-0.5">{p.pains.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      </div>
                    )}
                    {p.goals?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Goals</p>
                        <ul className="ml-4 list-disc space-y-0.5">{p.goals.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      </div>
                    )}
                    {p.triggers?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Buying triggers</p>
                        <ul className="ml-4 list-disc space-y-0.5">{p.triggers.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      </div>
                    )}
                    {p.objections?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Objections</p>
                        <ul className="ml-4 list-disc space-y-0.5">{p.objections.map((x, i) => <li key={i}>{x}</li>)}</ul>
                      </div>
                    )}
                    {p.channels?.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Where they hang out</p>
                        <div className="flex flex-wrap gap-1.5">{p.channels.map((c, i) => <Chip key={i}>{c}</Chip>)}</div>
                      </div>
                    )}
                    {p.content_style && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Preferred content style</p>
                        <p className="text-foreground">{p.content_style}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Journey */}
        {journey.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Map className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Customer Journey</h3>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {journey.map((s) => (
                <Card key={s.id} className="shadow-card">
                  <CardHeader className="pb-2">
                    <Badge variant="outline" className="w-fit text-xs">
                      Stage {s.stage_order + 1}
                    </Badge>
                    <CardTitle className="text-base">{STAGE_LABELS[s.stage] || s.stage}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {s.customer_thinking && (
                      <p className="italic text-muted-foreground">"{s.customer_thinking}"</p>
                    )}
                    {s.best_content && (
                      <div>
                        <p className="font-medium text-foreground">Best content</p>
                        <p className="text-muted-foreground">{s.best_content}</p>
                      </div>
                    )}
                    {s.best_cta && (
                      <div>
                        <p className="font-medium text-foreground">CTA</p>
                        <p className="text-muted-foreground">{s.best_cta}</p>
                      </div>
                    )}
                    {s.channels?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {s.channels.map((c, i) => <Chip key={i}>{c}</Chip>)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Messaging angles */}
        {angles.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-semibold">Messaging Angles</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {angles.map((a) => (
                <Card key={a.id} className="shadow-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{a.angle_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {a.hook_template && (
                      <div className="rounded-md bg-muted/50 p-2 font-mono text-xs">
                        {a.hook_template}
                      </div>
                    )}
                    {a.when_to_use && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">When: </span>{a.when_to_use}
                      </p>
                    )}
                    {a.example && (
                      <p className="text-xs italic text-muted-foreground">e.g. "{a.example}"</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
