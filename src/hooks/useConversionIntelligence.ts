import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ConversionStats {
  total_clicks: number;
  total_leads: number;
  total_conversions: number;
  total_revenue: number;
  click_to_lead: number;
  lead_to_conversion: number;
}

export function useConversionStats(appId?: string) {
  return useQuery({
    queryKey: ["conversion-stats", appId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const baseFilter = (q: any) => {
        let qq = q.eq("user_id", user.id);
        if (appId) qq = qq.eq("app_id", appId);
        return qq;
      };

      const [clicksRes, leadsRes, convRes] = await Promise.all([
        baseFilter(supabase.from("click_events").select("id", { count: "exact", head: true })),
        baseFilter(supabase.from("leads").select("id", { count: "exact", head: true })),
        baseFilter(supabase.from("conversions").select("amount")),
      ]);

      const total_clicks = clicksRes.count || 0;
      const total_leads = leadsRes.count || 0;
      const conv = convRes.data || [];
      const total_conversions = conv.length;
      const total_revenue = conv.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);

      return {
        total_clicks,
        total_leads,
        total_conversions,
        total_revenue,
        click_to_lead: total_clicks ? total_leads / total_clicks : 0,
        lead_to_conversion: total_leads ? total_conversions / total_leads : 0,
      } as ConversionStats;
    },
  });
}

export function useAnalyzeConversions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (appId?: string) => {
      const { data, error } = await supabase.functions.invoke("analyze-conversions", {
        body: appId ? { app_id: appId } : {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["learning_insights"] });
      qc.invalidateQueries({ queryKey: ["conversion-stats"] });
      toast({
        title: "Intelligence refreshed",
        description: `${data?.inserted ?? 0} new insight${(data?.inserted ?? 0) === 1 ? "" : "s"} based on your latest performance.`,
      });
    },
    onError: (e: any) => {
      toast({ title: "Analysis failed", description: e.message, variant: "destructive" });
    },
  });
}
