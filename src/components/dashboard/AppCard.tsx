import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Users, TrendingUp, MoreVertical, Sparkles, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteApp } from "@/hooks/useApps";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { App } from "@/hooks/useApps";

interface AppCardProps {
  id: string;
  name: string;
  description: string;
  posts: number;
  engagements: number;
  traffic: number;
  platforms?: string[];
}

export function AppCard({ id, name, description, posts, engagements, traffic, platforms }: AppCardProps) {
  const deleteApp = useDeleteApp();
  const { generateContent, isGenerating } = useGenerateContent();

  const handleGenerateContent = async () => {
    await generateContent({
      id,
      name,
      description,
      posts_count: posts,
      engagements_count: engagements,
      traffic_count: traffic,
      platforms: platforms || [],
    } as App);
  };

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
                  <span
                    key={platform}
                    className="rounded bg-accent px-1.5 py-px text-[9px] font-medium text-accent-foreground"
                  >
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
            <DropdownMenuItem disabled>Edit (Coming Soon)</DropdownMenuItem>
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

        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-foreground">{posts}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              <FileText className="h-2.5 w-2.5" /> Posts
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{engagements.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              <Users className="h-2.5 w-2.5" /> Engage
            </p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">{traffic.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
              <TrendingUp className="h-2.5 w-2.5" /> Traffic
            </p>
          </div>
        </div>

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
