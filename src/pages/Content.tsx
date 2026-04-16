import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useContent, useApproveContent, useDeleteContent, useRetryContent, useUpdateContent } from "@/hooks/useContent";
import { useApps } from "@/hooks/useApps";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { usePlatformConnections, Platform } from "@/hooks/usePlatformConnections";
import { usePublishNow } from "@/hooks/usePublishNow";
import { useContentScores } from "@/hooks/useContentScores";
import { Plus, Check, Clock, Edit2, Trash2, FileText, Loader2, Sparkles, AlertTriangle, Unlink, ExternalLink, XCircle, Send, Shield, Brain, RotateCcw, Save, X } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  approved: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  published: "bg-info/10 text-info border-info/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const platformLabels: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  email: "Email",
};

function ScoreBadge({ label, value, variant }: { label: string; value: number; variant: "good" | "warn" | "bad" }) {
  const colors = {
    good: "text-success",
    warn: "text-warning",
    bad: "text-destructive",
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold ${colors[variant]}`}>{value}</span>
    </div>
  );
}

function getScoreVariant(score: number, invert = false): "good" | "warn" | "bad" {
  if (invert) {
    if (score <= 15) return "good";
    if (score <= 30) return "warn";
    return "bad";
  }
  if (score >= 80) return "good";
  if (score >= 60) return "warn";
  return "bad";
}

export default function Content() {
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [appFilter, setAppFilter] = useState<string>("all");
  const { data: content, isLoading } = useContent();
  const { data: apps } = useApps();
  const { data: connections } = usePlatformConnections();
  const approveContent = useApproveContent();
  const deleteContent = useDeleteContent();
  const updateContent = useUpdateContent();
  const { generateContent, isGenerating } = useGenerateContent();
  const publishNow = usePublishNow();
  const retryContent = useRetryContent();

  const contentIds = content?.map((c) => c.id) || [];
  const { data: scores } = useContentScores(contentIds.length > 0 ? contentIds : undefined);
  const scoreMap = new Map(scores?.map((s) => [s.content_id, s]) || []);

  const connectedPlatforms = new Set(
    connections?.filter((c) => c.connected).map((c) => c.platform) || []
  );

  // Apply app filter first, then status
  const appFilteredContent = !content
    ? []
    : appFilter === "all"
      ? content
      : content.filter((c) => c.app_id === appFilter);

  const filterContent = (status?: string) => {
    if (!appFilteredContent) return [];
    if (!status || status === "all") return appFilteredContent;
    if (status === "failed") return appFilteredContent.filter((c) => c.status === "failed");
    return appFilteredContent.filter((c) => c.status === status);
  };

  const handleStartEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditText(currentText);
  };

  const handleSaveEdit = (id: string) => {
    if (!editText.trim()) {
      toast.error("Content cannot be empty");
      return;
    }
    updateContent.mutate({ id, content_text: editText.trim() }, {
      onSuccess: () => {
        setEditingId(null);
        setEditText("");
        toast.success("Post updated");
      },
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const renderContentList = (items: typeof content) => {
    const disconnectedItems = items?.filter(
      (item) => !connectedPlatforms.has(item.platform as Platform) && 
                (item.status === "pending" || item.status === "approved")
    ) || [];

    if (!items || items.length === 0) {
      return (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate content for your apps to see it here.
          </p>
          {apps && apps.length > 0 ? (
            <Link to="/create">
              <Button className="gap-2">
                <Sparkles className="h-4 w-4" />
                Create a Post
              </Button>
            </Link>
          ) : (
            <Link to="/onboarding">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First App
              </Button>
            </Link>
          )}
        </div>
      );
    }

    return (
      <TooltipProvider>
        <div className="space-y-4">
          {disconnectedItems.length > 0 && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {disconnectedItems.length} post{disconnectedItems.length > 1 ? "s" : ""} scheduled for disconnected platforms.{" "}
                <Link to="/settings?tab=platforms" className="underline font-medium">
                  Connect platforms in Settings
                </Link>
              </AlertDescription>
            </Alert>
          )}
          {items.map((item) => {
            const externalUrl = (item as any).external_url;
            const failureReason = (item as any).failure_reason;
            const isFailed = item.status === "failed";
            const score = scoreMap.get(item.id);
            const isEditing = editingId === item.id;
            const canEdit = item.status === "pending" || item.status === "approved" || item.status === "failed";

            return (
              <Card key={item.id} className={`shadow-card ${
                !connectedPlatforms.has(item.platform as Platform) && 
                (item.status === "pending" || item.status === "approved")
                  ? "border-destructive/50"
                  : isFailed
                    ? "border-destructive/30"
                    : ""
              }`}>
                <CardContent className="flex items-start gap-4 p-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="outline">{(item as any).apps?.name || "Unknown App"}</Badge>
                      <Badge variant="secondary" className="gap-1">
                        {!connectedPlatforms.has(item.platform as Platform) && 
                         (item.status === "pending" || item.status === "approved") && (
                          <Tooltip>
                            <TooltipTrigger>
                              <Unlink className="h-3 w-3 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Platform not connected — <Link to="/settings?tab=platforms" className="underline">connect now</Link>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {platformLabels[item.platform] || item.platform}
                      </Badge>
                      <Badge className={statusColors[item.status] || statusColors.pending}>
                        {isFailed && <XCircle className="h-3 w-3 mr-1" />}
                        {item.status}
                      </Badge>
                      {score?.auto_approved && (
                        <Badge variant="outline" className="gap-1 text-success border-success/20 bg-success/5">
                          <Brain className="h-3 w-3" />
                          Auto-approved
                        </Badge>
                      )}
                      {externalUrl && item.status === "published" && (
                        <a
                          href={externalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on {platformLabels[item.platform] || item.platform}
                        </a>
                      )}
                    </div>

                    {/* Content text or edit mode */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="min-h-[100px] text-sm"
                          placeholder="Write your post content..."
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1"
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={updateContent.isPending}
                          >
                            {updateContent.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-foreground whitespace-pre-wrap">{item.content_text}</p>
                    )}
                    
                    {/* Post Image */}
                    {(item as any).image_url && (
                      <div className="mt-2 rounded-lg overflow-hidden border max-w-xs">
                        <img 
                          src={(item as any).image_url} 
                          alt="Post image" 
                          className="w-full h-auto object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    {/* Quality Scores */}
                    {score && (
                      <div className="flex items-center gap-4 rounded-md bg-muted/50 px-3 py-2">
                        <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <ScoreBadge label="Quality" value={score.quality_score} variant={getScoreVariant(score.quality_score)} />
                        <ScoreBadge label="Clarity" value={score.clarity_score} variant={getScoreVariant(score.clarity_score)} />
                        <ScoreBadge label="Brand" value={score.brand_score} variant={getScoreVariant(score.brand_score)} />
                        <ScoreBadge label="Risk" value={score.risk_score} variant={getScoreVariant(score.risk_score, true)} />
                        <ScoreBadge label="Convert" value={score.conversion_score} variant={getScoreVariant(score.conversion_score)} />
                      </div>
                    )}

                    {/* Failure reason */}
                    {isFailed && failureReason && (
                      <div className="flex items-start gap-2 rounded-md bg-destructive/5 p-2 text-xs text-destructive">
                        <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{failureReason}</span>
                      </div>
                    )}

                    {item.scheduled_for && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>
                          {item.status === "published" ? "Published" : item.status === "failed" ? "Failed" : "Scheduled"}: {format(new Date(item.scheduled_for), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                    )}

                    {/* Performance signals for published posts */}
                    {item.status === "published" && (item.impressions || item.engagements || item.clicks) && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {item.impressions ? <span>{item.impressions.toLocaleString()} impressions</span> : null}
                        {item.engagements ? <span>{item.engagements.toLocaleString()} engagements</span> : null}
                        {item.clicks ? <span>{item.clicks.toLocaleString()} clicks</span> : null}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {item.status === "approved" && (item.platform === "x" || item.platform === "linkedin") && connectedPlatforms.has(item.platform) && (
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1"
                        onClick={() => {
                          setPublishingId(item.id);
                          publishNow.mutate(item.id, {
                            onSettled: () => setPublishingId(null),
                          });
                        }}
                        disabled={publishingId === item.id}
                      >
                        {publishingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Publish Now
                      </Button>
                    )}
                    {item.status === "approved" && !connectedPlatforms.has(item.platform as Platform) && (
                      <Link to="/settings?tab=platforms">
                        <Button size="sm" variant="outline" className="gap-1 text-warning">
                          <Unlink className="h-3 w-3" />
                          Connect
                        </Button>
                      </Link>
                    )}
                    {isFailed && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => retryContent.mutate(item.id)}
                        disabled={retryContent.isPending}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry
                      </Button>
                    )}
                    {item.status === "pending" && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1 text-success hover:text-success"
                        onClick={() => approveContent.mutate(item.id)}
                        disabled={approveContent.isPending}
                      >
                        <Check className="h-3 w-3" />
                        Approve
                      </Button>
                    )}
                    {canEdit && !isEditing && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleStartEdit(item.id, item.content_text)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteContent.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </TooltipProvider>
    );
  };

  const failedCount = filterContent("failed").length;

  return (
    <DashboardLayout title="Content">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-muted-foreground">Review and manage all generated marketing content.</p>
          <div className="flex items-center gap-2">
            {apps && apps.length > 1 && (
              <select
                value={appFilter}
                onChange={(e) => setAppFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label="Filter by app"
              >
                <option value="all">All apps</option>
                {apps.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            <Link to="/create">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Post
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">
                All ({appFilteredContent.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({filterContent("pending").length})
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved ({filterContent("approved").length})
              </TabsTrigger>
              <TabsTrigger value="published">
                Published ({filterContent("published").length})
              </TabsTrigger>
              {failedCount > 0 && (
                <TabsTrigger value="failed" className="text-destructive">
                  Failed ({failedCount})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {renderContentList(appFilteredContent)}
            </TabsContent>
            <TabsContent value="pending" className="mt-6">
              {renderContentList(filterContent("pending"))}
            </TabsContent>
            <TabsContent value="approved" className="mt-6">
              {renderContentList(filterContent("approved"))}
            </TabsContent>
            <TabsContent value="published" className="mt-6">
              {renderContentList(filterContent("published"))}
            </TabsContent>
            {failedCount > 0 && (
              <TabsContent value="failed" className="mt-6">
                {renderContentList(filterContent("failed"))}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
