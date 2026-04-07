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
}

const PLATFORMS: Platform[] = ["x", "linkedin", "instagram", "facebook"];

export function usePlatformConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["platform-connections", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Frontend query - tokens are in DB but we only select safe columns
      const { data, error } = await supabase
        .from("platform_connections")
        .select("id, user_id, platform, connected, connected_at, account_name, account_id, created_at, updated_at, expires_at, scope")
        .eq("user_id", user.id);

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
    mutationFn: async (platform: Platform) => {
      if (!user) throw new Error("Not authenticated");

      if (platform === "x") {
        // Real OAuth flow for X
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("No session token");

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/x-auth-start`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to start OAuth");

        // Redirect to X OAuth
        window.location.href = result.url;
        return null;
      }

      // Other platforms not yet supported for real OAuth
      throw new Error(`${platform.toUpperCase()} integration is coming soon. Only X (Twitter) is currently supported.`);
    },
    onSuccess: (data, platform) => {
      if (platform !== "x") {
        toast.success(`Connected to ${platform.toUpperCase()} successfully`);
        queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      }
      // X redirect handles its own flow
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
    mutationFn: async (platform: Platform) => {
      if (!user) throw new Error("Not authenticated");

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
        .eq("user_id", user.id)
        .eq("platform", platform);

      if (error) throw error;
    },
    onSuccess: (_, platform) => {
      queryClient.invalidateQueries({ queryKey: ["platform-connections"] });
      toast.success(`Disconnected from ${platform.toUpperCase()}`);
    },
    onError: (error) => {
      toast.error(`Failed to disconnect: ${error.message}`);
    },
  });
}

export function useIsplatformConnected(platform: Platform) {
  const { data: connections } = usePlatformConnections();
  return connections?.find((c) => c.platform === platform)?.connected ?? false;
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
