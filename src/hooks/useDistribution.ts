import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type TargetType = "channel" | "community" | "influencer" | "event";

export interface DistTarget {
  id: string;
  user_id: string;
  app_id: string | null;
  target_type: TargetType;
  platform: string | null;
  name: string;
  description: string | null;
  url: string | null;
  audience: string | null;
  event_date: string | null;
  audience_fit: number;
  reach_potential: number;
  competition_level: number;
  cost_score: number;
  conversion_potential: number;
  distribution_score: number;
  rationale: string | null;
  signals: any;
  status: string;
  saved_at: string | null;
  activated_at: string | null;
  contacted_at: string | null;
  posts_count: number;
  clicks_count: number;
  leads_count: number;
  conversions_count: number;
  revenue_attributed: number;
  source: string;
  created_at: string;
}

export interface DistRecommendation {
  id: string;
  insight: string;
  recommendation: string | null;
  basis: string;
  confidence: number;
  related_platform: string | null;
  created_at: string;
}

export function useDistribution(appId?: string) {
  return useQuery({
    queryKey: ["distribution", appId ?? "all"],
    queryFn: async () => {
      let tq = supabase.from("distribution_targets").select("*").order("distribution_score", { ascending: false }).limit(300);
      let rq = supabase.from("distribution_recommendations").select("*").order("created_at", { ascending: false }).limit(20);
      if (appId) { tq = tq.eq("app_id", appId); rq = rq.eq("app_id", appId); }
      const [tRes, rRes] = await Promise.all([tq, rq]);
      if (tRes.error) throw tRes.error;
      if (rRes.error) throw rRes.error;
      return { targets: (tRes.data ?? []) as DistTarget[], recommendations: (rRes.data ?? []) as DistRecommendation[] };
    },
  });
}

export function useDiscoverDistribution() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ appId, types }: { appId?: string; types?: TargetType[] }) => {
      const { data, error } = await supabase.functions.invoke("discover-distribution", {
        body: { app_id: appId, types },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["distribution"] });
      toast({ title: `${d?.created ?? 0} distribution targets discovered` });
    },
    onError: (e: any) => toast({ title: "Discovery failed", description: e.message, variant: "destructive" }),
  });
}

export type DistAction =
  | "save" | "activate" | "dismiss" | "view"
  | "mark_contacted" | "mark_converted"
  | "generate_channel_campaign"
  | "generate_community_outreach"
  | "generate_influencer_outreach"
  | "generate_event_strategy";

export function useDistributionAction() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ target_id, action }: { target_id: string; action: DistAction }) => {
      const { data, error } = await supabase.functions.invoke("distribution-action", {
        body: { target_id, action },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { data, action };
    },
    onSuccess: ({ action }) => {
      qc.invalidateQueries({ queryKey: ["distribution"] });
      qc.invalidateQueries({ queryKey: ["distribution-actions"] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      const labels: Partial<Record<DistAction, string>> = {
        save: "Saved",
        activate: "Activated",
        dismiss: "Dismissed",
        mark_contacted: "Marked as contacted",
        mark_converted: "Marked as converted",
        generate_channel_campaign: "Channel campaign drafted",
        generate_community_outreach: "Community outreach drafted",
        generate_influencer_outreach: "Influencer outreach drafted",
        generate_event_strategy: "Event strategy drafted",
      };
      if (labels[action]) toast({ title: labels[action]! });
    },
    onError: (e: any) => toast({ title: "Action failed", description: e.message, variant: "destructive" }),
  });
}

export function useDistributionActionsFor(targetId?: string) {
  return useQuery({
    queryKey: ["distribution-actions", targetId],
    enabled: !!targetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("distribution_actions")
        .select("*")
        .eq("target_id", targetId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
