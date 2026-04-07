import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlatformConnections, useConnectPlatform, useDisconnectPlatform, Platform, getTokenStatus } from "@/hooks/usePlatformConnections";
import { Loader2, Link2, Unlink, Twitter, Linkedin, Instagram, Facebook, AlertCircle, RefreshCw } from "lucide-react";
import { useContent } from "@/hooks/useContent";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const platformConfig: Record<Platform, { name: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  x: { name: "X (Twitter)", icon: Twitter, color: "bg-black text-white" },
  linkedin: { name: "LinkedIn", icon: Linkedin, color: "bg-blue-600 text-white" },
  instagram: { name: "Instagram", icon: Instagram, color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white" },
  facebook: { name: "Facebook", icon: Facebook, color: "bg-blue-500 text-white" },
};

const tokenStatusConfig = {
  active: { label: "Connected", className: "bg-success/10 text-success border-success/20" },
  expiring: { label: "Expiring Soon", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  expired: { label: "Needs Reconnect", className: "bg-destructive/10 text-destructive border-destructive/20" },
  disconnected: { label: "Not Connected", className: "bg-muted text-muted-foreground" },
};

export function PlatformConnections() {
  const { data: connections, isLoading } = usePlatformConnections();
  const { data: content } = useContent();
  const connectPlatform = useConnectPlatform();
  const disconnectPlatform = useDisconnectPlatform();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // Handle OAuth callback params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "x") {
      toast.success("Successfully connected to X (Twitter)!");
      queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      // Preserve tab param when clearing OAuth params
      setSearchParams({ tab: "platforms" }, { replace: true });
    } else if (error) {
      const messages: Record<string, string> = {
        access_denied: "You denied access to X. Try again when ready.",
        token_exchange_failed: "Failed to exchange token with X. Please try again.",
        state_mismatch: "Security check failed. Please try connecting again.",
        profile_fetch_failed: "Connected but couldn't fetch your profile. Try again.",
        server_error: "Something went wrong. Please try again.",
      };
      toast.error(messages[error] || `Connection error: ${error}`);
      setSearchParams({ tab: "platforms" }, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  const scheduledContent = content?.filter((c) =>
    c.status === "pending" || c.status === "approved"
  ) || [];

  const disconnectedPlatforms = new Set(
    connections?.filter((c) => !c.connected).map((c) => c.platform) || []
  );

  const warningContent = scheduledContent.filter((c) =>
    disconnectedPlatforms.has(c.platform as Platform)
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {warningContent.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have {warningContent.length} scheduled post{warningContent.length > 1 ? "s" : ""} for disconnected platforms.
            Connect the platforms to enable publishing.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Connected Platforms</CardTitle>
          <CardDescription>
            Connect your social media accounts to enable automated publishing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connections?.map((connection) => {
            const config = platformConfig[connection.platform as Platform];
            const Icon = config.icon;
            const isConnecting = connectPlatform.isPending;
            const isDisconnecting = disconnectPlatform.isPending;
            const status = getTokenStatus(connection);
            const statusConfig = tokenStatusConfig[status];

            return (
              <div
                key={connection.platform}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-2.5 ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{config.name}</span>
                      <Badge variant="outline" className={statusConfig.className}>
                        {statusConfig.label}
                      </Badge>
                    </div>
                    {connection.connected && connection.account_name && (
                      <p className="text-sm text-muted-foreground">{connection.account_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {status === "expired" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => connectPlatform.mutate(connection.platform as Platform)}
                      disabled={isConnecting}
                      className="gap-2"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Reconnect
                    </Button>
                  )}
                  {connection.connected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectPlatform.mutate(connection.platform as Platform)}
                      disabled={isDisconnecting}
                      className="gap-2"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4" />
                      )}
                      Disconnect
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => connectPlatform.mutate(connection.platform as Platform)}
                      disabled={isConnecting}
                      className="gap-2"
                    >
                      {isConnecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
