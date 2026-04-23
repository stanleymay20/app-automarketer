import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Lead {
  id: string;
  user_id: string;
  app_id: string;
  source_content_id: string | null;
  email: string;
  name: string | null;
  platform: string | null;
  status: string;
  lead_score: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversion {
  id: string;
  user_id: string;
  lead_id: string;
  app_id: string;
  source_content_id: string | null;
  amount: number;
  currency: string;
  source: string;
  notes: string | null;
  created_at: string;
}

export function useLeads(appId?: string) {
  return useQuery({
    queryKey: ["leads", appId],
    queryFn: async () => {
      let q = supabase.from("leads").select("*").order("created_at", { ascending: false });
      if (appId && appId !== "all") q = q.eq("app_id", appId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function useConversions(appId?: string) {
  return useQuery({
    queryKey: ["conversions", appId],
    queryFn: async () => {
      let q = supabase.from("conversions").select("*").order("created_at", { ascending: false });
      if (appId && appId !== "all") q = q.eq("app_id", appId);
      const { data, error } = await q;
      if (error) throw error;
      return data as Conversion[];
    },
  });
}

export function useClickEvents(appId?: string) {
  return useQuery({
    queryKey: ["click_events", appId],
    queryFn: async () => {
      let q = supabase.from("click_events").select("*").order("created_at", { ascending: false });
      if (appId && appId !== "all") q = q.eq("app_id", appId);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase.from("leads").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Lead updated" });
    },
  });
}

export function useAddConversion() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (conv: { lead_id: string; app_id: string; source_content_id?: string | null; amount: number; currency?: string; notes?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("conversions").insert({
        user_id: user.id,
        lead_id: conv.lead_id,
        app_id: conv.app_id,
        source_content_id: conv.source_content_id || null,
        amount: conv.amount,
        currency: conv.currency || "USD",
        source: "manual",
        notes: conv.notes || null,
      }).select().single();
      if (error) throw error;
      // mark lead as converted
      await supabase.from("leads").update({ status: "converted", lead_score: 100 }).eq("id", conv.lead_id);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversions"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast({ title: "Conversion recorded!" });
    },
  });
}
