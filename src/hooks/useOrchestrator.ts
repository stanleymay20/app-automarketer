import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OrchestrateInput {
  app_id: string;
  persona_id?: string | null;
  journey_stage?: string | null;
  messaging_angle?: string | null;
  goal?: string | null;
  goal_id?: string | null;
  seed_recommendation_id?: string | null;
  campaign_name?: string | null;
}

export function useOrchestrateCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: OrchestrateInput) => {
      const { data, error } = await supabase.functions.invoke("orchestrate-campaign", { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { campaign_id: string; campaign_name: string; counts: { posts: number; assets: number } };
    },
    onSuccess: (data) => {
      toast({ title: "Campaign generated", description: `${data.counts.posts} posts and ${data.counts.assets} assets created.` });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign_assets"] });
      qc.invalidateQueries({ queryKey: ["content"] });
    },
    onError: (e: any) => toast({ title: "Generation failed", description: e?.message ?? "Unknown error", variant: "destructive" }),
  });
}

export function useCampaignAssets(campaign_id?: string | null) {
  return useQuery({
    queryKey: ["campaign_assets", campaign_id],
    queryFn: async () => {
      if (!campaign_id) return [];
      const { data, error } = await supabase
        .from("campaign_assets")
        .select("*")
        .eq("campaign_id", campaign_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!campaign_id,
  });
}

export function useRecentCampaigns() {
  return useQuery({
    queryKey: ["campaigns", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}
