import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useApps } from "@/hooks/useApps";
import { useContent } from "@/hooks/useContent";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { PenLine, Zap, BarChart3, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: apps, isLoading } = useApps();
  const { data: content } = useContent();
  const appNameById = new Map((apps || []).map((a) => [a.id, a.name]));

  if (!isLoading && apps && apps.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "there";
  const recentPosts = (content || []).slice(0, 5);

  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    published: { icon: CheckCircle2, color: "text-success", label: "Published" },
    approved: { icon: Clock, color: "text-info", label: "Ready" },
    pending: { icon: AlertCircle, color: "text-warning", label: "Draft" },
    failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  };

  return (
    <DashboardLayout title="Home">
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold text-foreground lg:text-3xl">
            Hey {firstName} 👋
          </h1>
          <p className="text-muted-foreground">What do you want to do today?</p>
        </div>

        {/* Action Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/create">
            <Card className="group cursor-pointer border-2 border-transparent transition-all hover:border-primary hover:shadow-card-hover h-full">
              <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <PenLine className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Create a Post</h3>
                  <p className="text-xs text-muted-foreground mt-1">AI writes it, you publish it</p>
                </div>
                <Button size="sm" className="mt-auto gap-1.5 w-full">
                  <Sparkles className="h-3.5 w-3.5" />
                  Start Creating
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/content">
            <Card className="group cursor-pointer border-2 border-transparent transition-all hover:border-secondary hover:shadow-card-hover h-full">
              <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                  <Zap className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">Manage Content</h3>
                  <p className="text-xs text-muted-foreground mt-1">Review, approve & publish</p>
                </div>
                <Button size="sm" variant="outline" className="mt-auto gap-1.5 w-full">
                  View Queue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </Link>

          <Link to="/analytics">
            <Card className="group cursor-pointer border-2 border-transparent transition-all hover:border-info hover:shadow-card-hover h-full">
              <CardContent className="flex flex-col items-center text-center p-6 gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10 group-hover:bg-info/20 transition-colors">
                  <BarChart3 className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">View Performance</h3>
                  <p className="text-xs text-muted-foreground mt-1">See what's working</p>
                </div>
                <Button size="sm" variant="outline" className="mt-auto gap-1.5 w-full">
                  See Insights
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-foreground">Recent Activity</h2>
            {recentPosts.length > 0 && (
              <Link to="/content" className="text-xs text-primary hover:underline">
                View all
              </Link>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : recentPosts.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center text-center py-8">
                <PenLine className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No posts yet. Create your first one!</p>
                <Link to="/create">
                  <Button size="sm" className="mt-3 gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Create Post
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentPosts.map((post) => {
                const config = statusConfig[post.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <Card key={post.id} className="shadow-sm">
                    <CardContent className="flex items-center gap-3 p-3">
                      <StatusIcon className={`h-4 w-4 shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{post.content_text}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {appNameById.get(post.app_id) || "Unknown app"}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {post.platform}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(post.created_at), "MMM d")}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] shrink-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
