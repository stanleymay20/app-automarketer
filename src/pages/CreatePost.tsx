import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useApps } from "@/hooks/useApps";
import { useGenerateContent } from "@/hooks/useGenerateContent";
import { useContent, useApproveContent } from "@/hooks/useContent";
import { usePublishNow } from "@/hooks/usePublishNow";
import { usePlatformConnections, useConnectPlatform, Platform } from "@/hooks/usePlatformConnections";
import { Sparkles, Loader2, Send, ArrowLeft, CheckCircle2, Linkedin, Twitter, RefreshCw, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useContentScores } from "@/hooks/useContentScores";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Executive, authoritative" },
  { value: "casual", label: "Casual", description: "Friendly, conversational" },
  { value: "bold", label: "Bold", description: "Provocative, contrarian" },
  { value: "faith-aligned", label: "Faith-Aligned", description: "Purposeful, values-driven" },
];

export default function CreatePost() {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional");
  const [generatedIds, setGeneratedIds] = useState<string[]>([]);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);

  const { data: apps } = useApps();
  const { generateContent, isGenerating } = useGenerateContent();
  const { data: allContent } = useContent();
  const approveContent = useApproveContent();
  const publishNow = usePublishNow();
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const { data: connections } = usePlatformConnections();
  const connectPlatform = useConnectPlatform();

  const generatedPosts = (allContent || []).filter((c) => generatedIds.includes(c.id));
  const contentIds = generatedPosts.map((p) => p.id);
  const { data: scores } = useContentScores(contentIds.length > 0 ? contentIds : undefined);
  const scoreMap = new Map(scores?.map((s) => [s.content_id, s]) || []);

  const connectedPlatforms = new Set(
    connections?.filter((c) => c.connected).map((c) => c.platform) || []
  );

  const handleGenerate = async () => {
    if (!apps || apps.length === 0 || !topic.trim()) return;
    const app = apps[0];
    const result = await generateContent({
      ...app,
      description: topic,
      brand_tone: tone,
    });
    if (result) {
      setGeneratedIds(result.map((r: any) => r.id));
    }
  };

  const handlePublish = (postId: string, platform: string) => {
    const normalizedPlatform = platform as Platform;
    if (!connectedPlatforms.has(normalizedPlatform)) {
      setPendingPublishId(postId);
      setPendingPlatform(normalizedPlatform);
      setShowConnectModal(true);
      return;
    }
    setPublishingId(postId);
    publishNow.mutate(postId, {
      onSettled: () => setPublishingId(null),
    });
  };

  const handleConnect = (platform: Platform) => {
    connectPlatform.mutate({ platform });
    setShowConnectModal(false);
  };

  const platformIcon = (platform: string) => {
    if (platform === "linkedin") return <Linkedin className="h-3.5 w-3.5" />;
    if (platform === "x") return <Twitter className="h-3.5 w-3.5" />;
    return null;
  };

  const placeholders = [
    "How AI is changing small business marketing...",
    "3 tips to grow your audience on LinkedIn...",
    "Why most startups fail at content marketing...",
    "A behind-the-scenes look at our product launch...",
  ];
  const placeholder = placeholders[Math.floor(Math.random() * placeholders.length)];

  return (
    <DashboardLayout title="Create Post">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        {/* Step 1: Topic + Tone */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">What do you want to post about?</h2>
              <p className="text-sm text-muted-foreground mt-1">Describe your topic and we'll create platform-ready content.</p>
            </div>
            <Textarea
              placeholder={placeholder}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="min-h-[100px] text-base resize-none"
            />

            {/* Tone Selector */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground ml-1.5 text-xs">— {t.description}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim() || !apps?.length}
              className="w-full gap-2"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating your posts...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate Posts
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Generated Posts */}
        {generatedPosts.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-display font-semibold text-foreground">Your Posts</h3>
            {generatedPosts.map((post) => {
              const score = scoreMap.get(post.id);
              const isApproved = post.status === "approved";
              const isPublished = post.status === "published";

              return (
                <Card key={post.id} className="shadow-card">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="gap-1">
                        {platformIcon(post.platform)}
                        {post.platform === "linkedin" ? "LinkedIn" : post.platform === "x" ? "X (Twitter)" : post.platform}
                      </Badge>
                      {isPublished && (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Published
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{post.content_text}</p>

                    {post.image_url && (
                      <div className="rounded-lg overflow-hidden border">
                        <img src={post.image_url} alt="Post visual" className="w-full h-auto" loading="lazy" />
                      </div>
                    )}

                    {score && (
                      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Why this post works</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{score.quality_score}</p>
                            <p className="text-[10px] text-muted-foreground">Hook Strength</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{score.clarity_score}</p>
                            <p className="text-[10px] text-muted-foreground">Clarity</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-foreground">{score.conversion_score}</p>
                            <p className="text-[10px] text-muted-foreground">Engagement</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!isPublished && (
                      <div className="flex gap-2">
                        {!isApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 gap-1.5"
                            onClick={() => approveContent.mutate(post.id)}
                            disabled={approveContent.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </Button>
                        )}
                        {(post.platform === "linkedin" || post.platform === "x") && (
                          <Button
                            size="sm"
                            className="flex-1 gap-1.5"
                            onClick={() => handlePublish(post.id, post.platform)}
                            disabled={publishingId === post.id || (!isApproved && post.status !== "approved")}
                          >
                            {publishingId === post.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Send className="h-3.5 w-3.5" />
                            )}
                            Post to {post.platform === "linkedin" ? "LinkedIn" : "X"}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            <Button variant="outline" className="w-full gap-1.5" onClick={handleGenerate} disabled={isGenerating}>
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerate Posts
            </Button>
          </div>
        )}

        {/* Inline Connect Modal */}
        <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Connect {pendingPlatform === "linkedin" ? "LinkedIn" : "X"} to continue</DialogTitle>
              <DialogDescription>
                Link your account to publish directly. This only takes a moment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-2">
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={() => pendingPlatform && handleConnect(pendingPlatform)}
                disabled={connectPlatform.isPending}
              >
                {connectPlatform.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : pendingPlatform === "linkedin" ? (
                  <Linkedin className="h-4 w-4" />
                ) : (
                  <Twitter className="h-4 w-4" />
                )}
                Connect {pendingPlatform === "linkedin" ? "LinkedIn" : "X"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                We only request permission to post on your behalf. We never read your messages.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
