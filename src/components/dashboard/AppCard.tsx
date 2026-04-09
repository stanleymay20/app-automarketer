import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, TrendingUp, MoreVertical, Sparkles, Loader2, Eye, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteApp } from "@/hooks/useApps";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { Link } from "react-router-dom";
import { App } from "@/hooks/useApps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface AppCardProps {
  id: string;
  name: string;
  description: string;
  posts: number;
  engagements: number;
  traffic: number;
  platforms?: string[];
}

export function AppCard({ id, name, description, posts, platforms }: AppCardProps) {
  const deleteApp = useDeleteApp();
  const { generateContent, isGenerating } = useGenerateContent();

  // Fetch real metrics + last post + top post
  const { data: cardData } = useQuery({
    queryKey: ["app-card-data", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content")
        .select("id, impressions, engagements, clicks, status, platform, content_text, published_at, created_at")
        .eq("app_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const items = data || [];

      const published = items.filter(c => c.status === "published");
      const totalImpressions = published.reduce((sum, c) => sum + (c.impressions || 0), 0);
      const totalEngagements = published.reduce((sum, c) => sum + (c.engagements || 0), 0);
      const totalClicks = published.reduce((sum, c) => sum + (c.clicks || 0), 0);

      // Last post (most recent regardless of status)
      const lastPost = items[0] || null;

      // Top post (highest engagements among published)
      const topPost = published.length > 0
        ? published.reduce((best, c) => ((c.engagements || 0) > (best.engagements || 0) ? c : best), published[0])
        : null;

      return {
        impressions: totalImpressions,
        engagements: totalEngagements,
        clicks: totalClicks,
        lastPost,
        topPost: topPost && (topPost.engagements || 0) > 0 ? topPost : null,
      };
    },
  });

  const handleGenerateContent = async () => {
    await generateContent({
      id,
      name,
      description,
      posts_count: posts,
      engagements_count: cardData?.engagements || 0,
      traffic_count: cardData?.clicks || 0,
      platforms: platforms || [],
    } as App);
  };

  function formatNumber(num: number): string {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  }

  const statusConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
    published: { icon: CheckCircle2, color: "text-success", label: "Published" },
    approved: { icon: Clock, color: "text-info", label: "Ready" },
    pending: { icon: AlertCircle, color: "text-warning", label: "Draft" },
    failed: { icon: XCircle, color: "text-destructive", label: "Failed" },
  };

  const lastPost = cardData?.lastPost;
  const topPost = cardData?.topPost;
  const lastStatus = lastPost ? (statusConfig[lastPost.status] || statusConfig.pending) : null;

  return (
    <Card className="group relative overflow-hidden shadow-card transition-all duration-200 hover:shadow-card-hover">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-info/20 to-primary/20">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-semibold text-foreground truncate">{name}</h3>
            {platforms && platforms.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {platforms.map((platform) => (
                  <span key={platform} className="rounded bg-accent px-1.5 py-px text-[9px] font-medium text-accent-foreground">
                    {platform}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={handleGenerateContent} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Content
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/analytics">View Analytics</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => deleteApp.mutate(id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{formatNumber(cardData?.impressions || 0)}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              <Eye className="h-2.5 w-2.5" /> Views
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{formatNumber(cardData?.engagements || 0)}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              <Users className="h-2.5 w-2.5" /> Engage
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{formatNumber(cardData?.clicks || 0)}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> Clicks
            </p>
          </div>
        </div>

        {/* Last Post Status */}
        {lastPost && lastStatus && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <lastStatus.icon className={`h-3.5 w-3.5 shrink-0 ${lastStatus.color}`} />
            <p className="text-xs text-muted-foreground truncate flex-1">
              {lastPost.content_text.substring(0, 60)}...
            </p>
            <Badge variant="outline" className={`text-[9px] shrink-0 ${lastStatus.color}`}>
              {lastStatus.label}
            </Badge>
          </div>
        )}

        {/* Top Post Highlight */}
        {topPost && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 space-y-1">
            <p className="text-[10px] font-medium text-primary">⭐ Top Performer</p>
            <p className="text-xs text-foreground line-clamp-1">{topPost.content_text}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatNumber(topPost.engagements || 0)} engagements · {formatNumber(topPost.impressions || 0)} views
            </p>
          </div>
        )}

        <Button
          variant="outline"
          className="w-full gap-1.5 text-xs h-8"
          size="sm"
          onClick={handleGenerateContent}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Generate Content
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
