import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PortfolioSnapshot {
  id: string;
  app_id: string | null;
  computed_at: string;
  coverage_score: number;
  revenue_coverage: any[];
  format_coverage: any[];
  stage_coverage: any[];
  angle_coverage: any[];
  opportunities: any[];
  coach_headline: string | null;
  coach_action: string | null;
  coach_impact: string | null;
  totals: any;
}

export function useLatestPortfolioSnapshot(app_id?: string | null) {
  return useQuery({
    queryKey: ["portfolio_snapshot", app_id ?? "all"],
    queryFn: async () => {
      let q = supabase.from("portfolio_snapshots").select("*").order("computed_at", { ascending: false }).limit(1);
      q = app_id ? q.eq("app_id", app_id) : q.is("app_id", null);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data as PortfolioSnapshot | null;
    },
  });
}

export function useAnalyzePortfolio() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (app_id?: string | null) => {
      const { data, error } = await supabase.functions.invoke("analyze-content-portfolio", { body: { app_id: app_id ?? null } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return (data as any).snapshot as PortfolioSnapshot;
    },
    onSuccess: () => {
      toast({ title: "Portfolio analyzed", description: "Coverage and opportunities refreshed." });
      qc.invalidateQueries({ queryKey: ["portfolio_snapshot"] });
    },
    onError: (e: any) => toast({ title: "Analysis failed", description: e?.message ?? "Unknown", variant: "destructive" }),
  });
}
