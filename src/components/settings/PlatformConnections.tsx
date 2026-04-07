import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePlatformConnections, useConnectPlatform, useDisconnectPlatform, Platform, getTokenStatus } from "@/hooks/usePlatformConnections";
import { Loader2, Link2, Unlink, Twitter, Linkedin, Instagram, Facebook, AlertCircle, RefreshCw } from "lucide-react";
import { useContent } from "@/hooks/useContent";
import { useApps } from "@/hooks/useApps";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SUPPORTED_PLATFORMS: Platform[] = ["x"];
const ALL_PLATFORMS: Platform[] = ["x", "linkedin", "instagram", "facebook"];

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
  const { data: apps } = useApps();
  const [selectedAppId, setSelectedAppId] = useState<string | undefined>(undefined);
  const { data: connections, isLoading, isError } = usePlatformConnections(selectedAppId);
  const { data: content } = useContent();
  const connectPlatform = useConnectPlatform();
  const disconnectPlatform = useDisconnectPlatform();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [actionPlatform, setActionPlatform] = useState<Platform | null>(null);

  // Set first app as default when apps load
  useEffect(() => {
    if (apps && apps.length > 0 && !selectedAppId) {
      setSelectedAppId(apps[0].id);
    }
  }, [apps, selectedAppId]);

  // Handle OAuth callback params
  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");

    if (connected === "x") {
      toast.success("Successfully connected to X (Twitter)!");
      queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      setSearchParams({ tab: "platforms" }, { replace: true });
    } else if (error) {
      const messages: Record<string, string> = {
        access_denied: "You denied access to X. Try again when ready.",
        token_exchange_failed: "Failed to exchange token with X. Please try again.",
        state_mismatch: "Security check failed. Please try connecting again.",
        profile_fetch_failed: "Connected but couldn't fetch your profile. Try again.",
        server_error: "Something went wrong. Please try again.",
        missing_params: "OAuth response was incomplete. Please try again.",
        invalid_state: "Invalid OAuth state. Please try connecting again.",
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

  if (isLoading || !apps) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Failed to load platform connections. Please refresh.</p>
        </CardContent>
      </Card>
    );
  }

  const handleConnect = (platform: Platform) => {
    setActionPlatform(platform);
    connectPlatform.mutate({ platform, appId: selectedAppId }, {
      onSettled: () => setActionPlatform(null),
    });
  };

  const handleDisconnect = (platform: Platform) => {
    setActionPlatform(platform);
    disconnectPlatform.mutate({ platform, appId: selectedAppId }, {
      onSettled: () => setActionPlatform(null),
    });
  };

  const deduplicatedConnections = (() => {
    const allConnections = connections || [];
    const byPlatform = new Map<string, typeof allConnections[number]>();
    
    // First add temp entries for all platforms as defaults
    for (const platform of ALL_PLATFORMS) {
      byPlatform.set(platform, {
        id: `temp-${platform}`,
        user_id: "",
        platform: platform as Platform,
        connected: false,
        connected_at: null,
        account_name: null,
        account_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
        scope: null,
        app_id: selectedAppId || null,
      });
    }
    
    // Then override with real connections
    for (const conn of allConnections) {
      const existing = byPlatform.get(conn.platform);
      if (!existing || existing.id.startsWith("temp-")) {
        byPlatform.set(conn.platform, conn);
      }
      if (conn.app_id === selectedAppId && existing && !existing.id.startsWith("temp-") && existing.app_id !== selectedAppId) {
        byPlatform.set(conn.platform, conn);
      }
    }
    return Array.from(byPlatform.values());
  })();

  return (
    <div className="space-y-4">
      {/* App selector */}
      {apps && apps.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Connect for app:</span>
          <Select value={selectedAppId} onValueChange={setSelectedAppId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select an app" />
            </SelectTrigger>
            <SelectContent>
              {apps.map((app) => (
                <SelectItem key={app.id} value={app.id}>
                  {app.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
            Connect your social media accounts to enable automated publishing. Each app can use a different account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {deduplicatedConnections.map((connection) => {
            const config = platformConfig[connection.platform];
            if (!config) return null;
            const Icon = config.icon;
            const isSupported = SUPPORTED_PLATFORMS.includes(connection.platform);
            const isThisConnecting = actionPlatform === connection.platform && connectPlatform.isPending;
            const isThisDisconnecting = actionPlatform === connection.platform && disconnectPlatform.isPending;
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{config.name}</span>
                      {isSupported ? (
                        <Badge variant="outline" className={statusConfig.className}>
                          {statusConfig.label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    {connection.connected && connection.account_name && (
                      <p className="text-sm text-muted-foreground">{connection.account_name}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!isSupported ? (
                    <Button size="sm" variant="outline" disabled className="gap-2">
                      <Link2 className="h-4 w-4" />
                      Connect
                    </Button>
                  ) : (
                    <>
                      {status === "expired" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConnect(connection.platform)}
                          disabled={isThisConnecting}
                          className="gap-2"
                        >
                          {isThisConnecting ? (
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
                          onClick={() => handleDisconnect(connection.platform)}
                          disabled={isThisDisconnecting}
                          className="gap-2"
                        >
                          {isThisDisconnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Unlink className="h-4 w-4" />
                          )}
                          Disconnect
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleConnect(connection.platform)}
                          disabled={isThisConnecting || !selectedAppId}
                          className="gap-2"
                        >
                          {isThisConnecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Link2 className="h-4 w-4" />
                          )}
                          Connect
                        </Button>
                      )}
                    </>
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
