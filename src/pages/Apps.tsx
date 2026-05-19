import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddAppDialog } from "@/components/apps/AddAppDialog";
import { useApps, useDeleteApp } from "@/hooks/useApps";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { AppWindow, MoreVertical, ExternalLink, Sparkles, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const platformLabels: Record<string, string> = {
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  facebook: "Facebook",
  email: "Email Newsletter",
};

export default function Apps() {
  const { data: apps, isLoading } = useApps();
  const deleteApp = useDeleteApp();
  const { generateContent, isGenerating } = useGenerateContent();

  return (
    <DashboardLayout title="Apps">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Manage all your apps and their marketing settings.</p>
          <AddAppDialog />
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-lg bg-muted animate-pulse" />
            ))}
          </div>
        ) : apps && apps.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <Card key={app.id} className="shadow-card transition-all hover:shadow-card-hover">
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-info/20 to-primary/20">
                      <AppWindow className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-lg">{app.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{app.posts_count || 0} posts generated</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem onClick={() => generateContent(app)}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/content?app=${app.id}`}>View Content</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/analytics?app=${app.id}`}>View Analytics</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/apps/${app.id}/landing`}>Landing Page</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteApp.mutate(app.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {app.description || "No description provided"}
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Audience</span>
                      <span className="font-medium">{app.target_audience || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Brand Tone</span>
                      <span className="font-medium capitalize">{app.brand_tone || "Not set"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Goal</span>
                      <span className="font-medium capitalize">{app.primary_goal || "Not set"}</span>
                    </div>
                  </div>

                  {app.platforms && app.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {app.platforms.map((platform) => (
                        <span
                          key={platform}
                          className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                        >
                          {platformLabels[platform] || platform}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Link to={`/content?app=${app.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2">
                        <AppWindow className="h-4 w-4" />
                        View Content
                      </Button>
                    </Link>
                    <Link to="/create" className="flex-1">
                      <Button className="w-full gap-2">
                        <Sparkles className="h-4 w-4" />
                        Create Post
                      </Button>
                    </Link>
                    {app.website_url && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={app.website_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-12 text-center">
            <AppWindow className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">No apps yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first app to start generating marketing content.
            </p>
            <AddAppDialog />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
