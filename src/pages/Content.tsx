import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useContent, useApproveContent, useDeleteContent } from "@/hooks/useContent";
import { useApps } from "@/hooks/useApps";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { Plus, Check, Clock, Edit2, Trash2, FileText, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";

const statusColors = {
  approved: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  published: "bg-info/10 text-info border-info/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const platformLabels: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  email: "Email",
};

export default function Content() {
  const { data: content, isLoading } = useContent();
  const { data: apps } = useApps();
  const approveContent = useApproveContent();
  const deleteContent = useDeleteContent();
  const { generateContent, isGenerating } = useGenerateContent();

  const filterContent = (status?: string) => {
    if (!content) return [];
    if (!status || status === "all") return content;
    return content.filter((c) => c.status === status);
  };

  const renderContentList = (items: typeof content) => {
    if (!items || items.length === 0) {
      return (
        <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-display text-lg font-semibold mb-2">No content yet</h3>
          <p className="text-muted-foreground mb-4">
            Generate content for your apps to see it here.
          </p>
          {apps && apps.length > 0 && (
            <Button 
              onClick={() => generateContent(apps[0])}
              disabled={isGenerating}
              className="gap-2"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Generate for {apps[0].name}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="shadow-card">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant="outline">{(item as any).apps?.name || "Unknown App"}</Badge>
                  <Badge variant="secondary">{platformLabels[item.platform] || item.platform}</Badge>
                  <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                    {item.status}
                  </Badge>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{item.content_text}</p>
                {item.scheduled_for && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {item.status === "published" ? "Published" : "Scheduled"}: {format(new Date(item.scheduled_for), "MMM d, yyyy h:mm a")}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
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
                <Button size="icon" variant="ghost" className="h-8 w-8">
                  <Edit2 className="h-4 w-4" />
                </Button>
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
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout title="Content">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Review and manage all generated marketing content.</p>
          {apps && apps.length > 0 && (
            <Button 
              className="gap-2"
              onClick={() => generateContent(apps[0])}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Content
            </Button>
          )}
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
                All Content ({content?.length || 0})
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
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {renderContentList(content)}
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
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
