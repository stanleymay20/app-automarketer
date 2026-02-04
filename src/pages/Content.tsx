import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Clock, Edit2, Trash2 } from "lucide-react";

const content = [
  {
    id: 1,
    app: "AppOne",
    platform: "X",
    content: "🚀 Boost your productivity with AppOne! Track tasks, set goals, and achieve more every day. Try it free! #productivity #goals",
    status: "approved",
    scheduledFor: "Feb 5, 2025 10:00 AM",
  },
  {
    id: 2,
    app: "AppTwo",
    platform: "Instagram",
    content: "New challenge alert! 💪 Join our 30-day fitness journey and transform your health. Link in bio! #fitness #challenge",
    status: "pending",
    scheduledFor: "Feb 6, 2025 2:00 PM",
  },
  {
    id: 3,
    app: "AutoBot",
    platform: "LinkedIn",
    content: "Customer service shouldn't be complicated. AutoBot handles inquiries 24/7 with AI precision. See how businesses are saving 40% on support costs.",
    status: "published",
    scheduledFor: "Feb 4, 2025 9:00 AM",
  },
  {
    id: 4,
    app: "AppOne",
    platform: "LinkedIn",
    content: "Professionals are 3x more likely to hit their goals when using task management tools. AppOne helps you stay focused and organized.",
    status: "pending",
    scheduledFor: "Feb 7, 2025 11:00 AM",
  },
];

const statusColors = {
  approved: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  published: "bg-info/10 text-info border-info/20",
};

export default function Content() {
  return (
    <DashboardLayout title="Content">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">Review and manage all generated marketing content.</p>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Generate Content
          </Button>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Content</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="space-y-4">
              {content.map((item) => (
                <Card key={item.id} className="shadow-card">
                  <CardContent className="flex items-start gap-4 p-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{item.app}</Badge>
                        <Badge variant="secondary">{item.platform}</Badge>
                        <Badge className={statusColors[item.status as keyof typeof statusColors]}>
                          {item.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground">{item.content}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Scheduled: {item.scheduledFor}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {item.status === "pending" && (
                        <Button size="sm" variant="outline" className="gap-1 text-success hover:text-success">
                          <Check className="h-3 w-3" />
                          Approve
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pending" className="mt-6">
            <div className="space-y-4">
              {content
                .filter((c) => c.status === "pending")
                .map((item) => (
                  <Card key={item.id} className="shadow-card">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{item.app}</Badge>
                          <Badge variant="secondary">{item.platform}</Badge>
                        </div>
                        <p className="text-sm text-foreground">{item.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Scheduled: {item.scheduledFor}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1">
                          <Check className="h-3 w-3" />
                          Approve & Publish
                        </Button>
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="approved" className="mt-6">
            <p className="text-muted-foreground">No approved content awaiting publishing.</p>
          </TabsContent>

          <TabsContent value="published" className="mt-6">
            <div className="space-y-4">
              {content
                .filter((c) => c.status === "published")
                .map((item) => (
                  <Card key={item.id} className="shadow-card">
                    <CardContent className="flex items-start gap-4 p-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{item.app}</Badge>
                          <Badge variant="secondary">{item.platform}</Badge>
                          <Badge className={statusColors.published}>Published</Badge>
                        </div>
                        <p className="text-sm text-foreground">{item.content}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Published: {item.scheduledFor}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
