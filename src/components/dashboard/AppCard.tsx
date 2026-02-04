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
    <Card className="group relative overflow-hidden shadow-card transition-all duration-300 hover:shadow-card-hover">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-info/20 to-primary/20">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">{name}</h3>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover">
            <DropdownMenuItem onClick={handleGenerateContent} disabled={isGenerating}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Content
            </DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem>View Analytics</DropdownMenuItem>
            <DropdownMenuItem 
              className="text-destructive"
              onClick={() => deleteApp.mutate(id)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        
        {platforms && platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {platforms.map((platform) => (
              <span
                key={platform}
                className="rounded bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground"
              >
                {platform}
              </span>
            ))}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-info" />
              <span className="text-sm font-semibold text-info">{posts} Posts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>ENGAGEMENTS</span>
            </div>
            <p className="text-lg font-bold text-foreground">{engagements.toLocaleString()}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <span className="text-sm font-semibold text-muted-foreground">TRAFFIC</span>
            </div>
            <p className="text-lg font-bold text-foreground">{traffic.toLocaleString()}</p>
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full gap-2" 
          size="sm"
          onClick={handleGenerateContent}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Content
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
