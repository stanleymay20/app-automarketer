import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContent } from "@/hooks/useContent";
import { usePlatformConnections } from "@/hooks/usePlatformConnections";
import { AlertTriangle, ExternalLink, RefreshCw, XCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function InterventionInbox() {
  const { data: content } = useContent();
  const { data: connections } = usePlatformConnections();

  const failedPosts = (content || []).filter((c) => c.status === "failed");
  const disconnected = (connections || []).filter((c) => !c.connected);
  const lowConfidencePosts = (content || []).filter((c) => c.status === "pending");

  const totalIssues = failedPosts.length + disconnected.length;

  if (totalIssues === 0 && lowConfidencePosts.length === 0) {
    return null; // Don't show when nothing needs attention
  }

  return (
    <Card className={totalIssues > 0 ? "border-warning/30" : ""}>
      <CardHeader className="pb-2 p-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Inbox className="h-4 w-4 text-warning" />
          Needs Attention
          {totalIssues > 0 && (
            <span className="ml-auto rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
              {totalIssues}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {failedPosts.length > 0 && (
          <Link to="/content" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50 transition-colors">
            <XCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-sm text-foreground">
              {failedPosts.length} failed post{failedPosts.length > 1 ? "s" : ""}
            </span>
          </Link>
        )}

        {disconnected.length > 0 && (
          <Link to="/settings" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50 transition-colors">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
            <span className="text-sm text-foreground">
              {disconnected.length} platform{disconnected.length > 1 ? "s" : ""} disconnected
            </span>
          </Link>
        )}

        {lowConfidencePosts.length > 0 && (
          <Link to="/content" className="flex items-center gap-2 rounded-md p-2 hover:bg-muted/50 transition-colors">
            <RefreshCw className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-foreground">
              {lowConfidencePosts.length} post{lowConfidencePosts.length > 1 ? "s" : ""} awaiting review
            </span>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
