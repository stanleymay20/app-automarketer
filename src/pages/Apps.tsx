import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, AppWindow, MoreVertical, ExternalLink } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const apps = [
  {
    id: 1,
    name: "AppOne",
    description: "A productivity app for managing daily tasks and goals.",
    audience: "Professionals & Students",
    tone: "Professional",
    posts: 24,
    platforms: ["X", "LinkedIn"],
  },
  {
    id: 2,
    name: "AppTwo",
    description: "Social fitness tracking with community challenges.",
    audience: "Fitness Enthusiasts",
    tone: "Friendly & Motivating",
    posts: 18,
    platforms: ["Instagram", "Facebook"],
  },
  {
    id: 3,
    name: "AutoBot",
    description: "AI-powered chatbot for customer service automation.",
    audience: "Businesses & Startups",
    tone: "Bold & Technical",
    posts: 12,
    platforms: ["X", "LinkedIn"],
  },
];

export default function Apps() {
  return (
    <DashboardLayout title="Apps">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Manage all your apps and their marketing settings.</p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add App
          </Button>
        </div>

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
                    <p className="text-xs text-muted-foreground">{app.posts} posts generated</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit App</DropdownMenuItem>
                    <DropdownMenuItem>Generate Content</DropdownMenuItem>
                    <DropdownMenuItem>View Analytics</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{app.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Audience</span>
                    <span className="font-medium">{app.audience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Brand Tone</span>
                    <span className="font-medium">{app.tone}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {app.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground"
                    >
                      {platform}
                    </span>
                  ))}
                </div>

                <Button variant="outline" className="w-full gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
