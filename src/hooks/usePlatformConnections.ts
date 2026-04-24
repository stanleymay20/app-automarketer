import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type Platform = "x" | "linkedin" | "instagram" | "facebook";

export interface PlatformConnection {
  id: string;
  user_id: string;
  platform: Platform;
  connected: boolean;
  connected_at: string | null;
  account_name: string | null;
  account_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  scope: string | null;
  app_id: string | null;
}

const PLATFORMS: Platform[] = ["x", "linkedin", "instagram", "facebook"];

export function usePlatformConnections(appId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["platform-connections", user?.id, appId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("platform_connections")
        .select("id, user_id, platform, connected, connected_at, account_name, account_id, created_at, updated_at, expires_at, scope, app_id")
        .eq("user_id", user.id);

      if (appId) {
        // Get connections for this specific app OR user-level (null app_id)
        query = query.or(`app_id.eq.${appId},app_id.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const existingPlatforms = new Set(data?.map((c) => c.platform) || []);
      const connections: PlatformConnection[] = [...(data || [])] as PlatformConnection[];

      for (const platform of PLATFORMS) {
        if (!existingPlatforms.has(platform)) {
          connections.push({
            id: `temp-${platform}`,
            user_id: user.id,
            platform,
            connected: false,
            connected_at: null,
            account_name: null,
            account_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expires_at: null,
            scope: null,
            app_id: appId || null,
          });
        }
      }

      return connections;
    },
    enabled: !!user,
  });
}

export function useConnectPlatform() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ platform, appId }: { platform: Platform; appId?: string }) => {
      if (!user) throw new Error("Not authenticated");

      if (platform === "x" || platform === "linkedin") {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("No session token");

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const functionName = platform === "x" ? "x-auth-start" : "linkedin-auth-start";
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/${functionName}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              app_id: appId || null,
              return_to: window.location.origin,
            }),
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to start OAuth");
        if (!result.url) throw new Error("Provider did not return an authorization URL");

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        let isEmbedded = false;
        try {
          isEmbedded = window.self !== window.top;
        } catch {
          isEmbedded = true;
        }
        console.info("[OAuthStart] Launching provider", {
          platform,
          appId: appId || null,
          origin: window.location.origin,
          mode: isMobile || isEmbedded ? "new-tab" : "popup",
          isEmbedded,
        });

        // When embedded in an iframe (Lovable preview), X/LinkedIn block framing.
        // Always open OAuth in a brand-new top-level tab so the provider page renders.
        if (isEmbedded || isMobile) {
          const newTab = window.open(result.url, "_blank");
          if (!newTab) {
            // Popup blocked: try to escape iframe; if cross-origin throws, navigate self.
            try {
              if (window.top && window.top !== window.self) {
                window.top.location.href = result.url;
              } else {
                window.location.href = result.url;
              }
            } catch {
              window.location.href = result.url;
            }
            toast.message("Opening sign-in...", {
              description: "If nothing happens, allow popups for this site.",
            });
          }
          return null;
        }

        const authWindow = window.open(result.url, "_blank", "noopener,noreferrer");
        if (!authWindow) {
          window.location.assign(result.url);
        }
        return null;
      }

      throw new Error(`${platform.toUpperCase()} integration is coming soon.`);
    },
    onSuccess: (data, { platform }) => {
      if (platform !== "x" && platform !== "linkedin") {
        toast.success(`Connected to ${platform.toUpperCase()} successfully`);
        queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      }
    },
    onError: (error) => {
      toast.error(`Failed to connect: ${error.message}`);
    },
  });
}

export function useDisconnectPlatform() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ platform, appId }: { platform: Platform; appId?: string }) => {
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("platform_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("platform", platform);

      if (appId) {
        query = query.eq("app_id", appId);
      } else {
        query = query.is("app_id", null);
      }

      const { data: existing } = await query.maybeSingle();

      if (!existing) {
        throw new Error("No connection to disconnect");
      }

      const { error } = await supabase
        .from("platform_connections")
        .update({
          connected: false,
          connected_at: null,
          account_name: null,
          account_id: null,
          access_token: null,
          refresh_token: null,
          expires_at: null,
          token_type: null,
          scope: null,
        })
        .eq("id", existing.id);

      if (error) throw error;
    },
    onSuccess: (_, { platform }) => {
      queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      toast.success(`Disconnected from ${platform.toUpperCase()}`);
    },
    onError: (error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });
}

export function useIsplatformConnected(platform: Platform, appId?: string) {
  const { data: connections } = usePlatformConnections(appId);
  return connections?.find((c) => c.platform === platform && c.connected) ? true : false;
}

export function getTokenStatus(connection: PlatformConnection): "active" | "expiring" | "expired" | "disconnected" {
  if (!connection.connected) return "disconnected";
  if (!connection.expires_at) return "active";
  
  const expiresAt = new Date(connection.expires_at);
  const now = new Date();
  const hourFromNow = new Date(Date.now() + 60 * 60 * 1000);
  
  if (expiresAt < now) return "expired";
  if (expiresAt < hourFromNow) return "expiring";
  return "active";
}
