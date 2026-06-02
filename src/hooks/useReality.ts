import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type RealitySnapshot = {
  publish: { total: number; published: number; failed: number; pending: number; success_rate: number; avg_latency_ms: number | null; recovered_by_retry: number; by_platform: { platform: string; published: number; failed: number; success_rate: number }[] };
  funnel: { clicks: number; leads: number; conversions: number; revenue: number };
  attribution: { content_to_persona: number; content_to_distribution: number; content_to_campaign: number; content_to_recommendation: number; leads_to_content: number; revenue_to_content: number };
  engines: { key: string; label: string; rows: number; last_activity: string | null }[];
  adoption: { name: string; generated: number; used: number }[];
  health_score: number;
  health_breakdown: { engines_active: number; recent_activity: number; attribution: number; adoption: number };
};

export function useRealitySnapshot() {
  return useQuery({
    queryKey: ["reality-snapshot"],
    queryFn: async (): Promise<RealitySnapshot> => {
      const { data, error } = await supabase.functions.invoke("reality-snapshot");
      if (error) throw error;
      return data as RealitySnapshot;
    },
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

export type FailureGroup = { category: string; count: number; pct: number; platforms: string[]; top_reason: string | null; sample_ids: string[]; remediation: string };

export function usePublishFailures() {
  return useQuery({
    queryKey: ["publish-failures"],
    queryFn: async (): Promise<{ total_failed: number; groups: FailureGroup[] }> => {
      const { data, error } = await supabase.functions.invoke("analyze-publish-failures");
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
  });
}

export function useFunnelTest() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("funnel-test");
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reality-snapshot"] });
      toast({
        title: data.ok ? "Funnel verified end-to-end" : "Funnel test detected gaps",
        description: data.ok
          ? `Rollup landed: ${JSON.stringify(data.rollup)}`
          : (data.steps?.find((s: any) => !s.ok)?.detail ?? "See details"),
        variant: data.ok ? "default" : "destructive",
      });
    },
    onError: (e: any) => {
      toast({ title: "Funnel test failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useBootstrapApp() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (app_id: string) => {
      const { data, error } = await supabase.functions.invoke("bootstrap-app", { body: { app_id } });
      if (error) throw error;
      return data as { ok: number; total: number; results: Record<string, { status: string; error?: string }> };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["reality-snapshot"] });
      toast({
        title: `Workspace setup ${data.ok}/${data.total} completed`,
        description: Object.entries(data.results).map(([k, v]) => `${k}: ${v.status}`).join(" • "),
      });
    },
  });
}
