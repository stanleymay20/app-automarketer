import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Campaign {
  id: string;
  app_id: string;
  user_id: string;
  goal_id: string | null;
  campaign_name: string;
  strategy_summary: string | null;
  themes: string[];
  platform_mix: string[];
  posting_frequency: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export function useCampaigns(appId?: string) {
  return useQuery({
    queryKey: ["campaigns", appId],
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (appId) query = query.eq("app_id", appId);

      const { data, error } = await query;
      if (error) throw error;
      return data as Campaign[];
    },
  });
}

export function useGenerateCampaign() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (appId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-campaign", {
        body: { app_id: appId, user_id: user.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast({
        title: "Campaign created",
        description: `"${data.campaign.campaign_name}" is ready.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Campaign generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
