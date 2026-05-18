import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AudienceProfile {
  id: string;
  app_id: string;
  status: string;
  last_generated_at: string | null;
  raw_research: string | null;
}

export interface ICP {
  id: string;
  app_id: string;
  segment: string;
  company_size: string | null;
  industry: string | null;
  signals: string[];
  notes: string | null;
  sort_order: number;
}

export interface Persona {
  id: string;
  app_id: string;
  icp_id: string | null;
  title: string;
  company_size: string | null;
  responsibilities: string[];
  pains: string[];
  goals: string[];
  triggers: string[];
  objections: string[];
  channels: string[];
  content_style: string | null;
  sort_order: number;
}

export interface JourneyStage {
  id: string;
  app_id: string;
  stage: string;
  stage_order: number;
  customer_thinking: string | null;
  pains: string[];
  best_content: string | null;
  best_cta: string | null;
  channels: string[];
}

export interface MessagingAngle {
  id: string;
  app_id: string;
  angle_name: string;
  hook_template: string | null;
  when_to_use: string | null;
  example: string | null;
  sort_order: number;
}

export function useAudienceProfile(appId?: string) {
  return useQuery({
    queryKey: ["audience-profile", appId],
    queryFn: async () => {
      if (!appId) return null;
      const { data, error } = await (supabase as any)
        .from("audience_profiles")
        .select("*")
        .eq("app_id", appId)
        .maybeSingle();
      if (error) throw error;
      return data as AudienceProfile | null;
    },
    enabled: !!appId,
  });
}

export function useICPs(appId?: string) {
  return useQuery({
    queryKey: ["icps", appId],
    queryFn: async () => {
      if (!appId) return [];
      const { data, error } = await (supabase as any)
        .from("icps")
        .select("*")
        .eq("app_id", appId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as ICP[];
    },
    enabled: !!appId,
  });
}

export function usePersonas(appId?: string) {
  return useQuery({
    queryKey: ["personas", appId],
    queryFn: async () => {
      if (!appId) return [];
      const { data, error } = await (supabase as any)
        .from("personas")
        .select("*")
        .eq("app_id", appId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as Persona[];
    },
    enabled: !!appId,
  });
}

export function useJourneyStages(appId?: string) {
  return useQuery({
    queryKey: ["journey-stages", appId],
    queryFn: async () => {
      if (!appId) return [];
      const { data, error } = await (supabase as any)
        .from("journey_stages")
        .select("*")
        .eq("app_id", appId)
        .order("stage_order");
      if (error) throw error;
      return (data || []) as JourneyStage[];
    },
    enabled: !!appId,
  });
}

export function useMessagingAngles(appId?: string) {
  return useQuery({
    queryKey: ["messaging-angles", appId],
    queryFn: async () => {
      if (!appId) return [];
      const { data, error } = await (supabase as any)
        .from("messaging_angles")
        .select("*")
        .eq("app_id", appId)
        .order("sort_order");
      if (error) throw error;
      return (data || []) as MessagingAngle[];
    },
    enabled: !!appId,
  });
}

export function useGenerateAudience() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (appId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "generate-audience-intelligence",
        { body: { app_id: appId } },
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return { appId, ...data };
    },
    onSuccess: ({ appId }) => {
      qc.invalidateQueries({ queryKey: ["audience-profile", appId] });
      qc.invalidateQueries({ queryKey: ["icps", appId] });
      qc.invalidateQueries({ queryKey: ["personas", appId] });
      qc.invalidateQueries({ queryKey: ["journey-stages", appId] });
      qc.invalidateQueries({ queryKey: ["messaging-angles", appId] });
      toast({
        title: "Audience built",
        description: "Your ICPs, personas, journey, and angles are ready.",
      });
    },
    onError: (e: any) => {
      toast({
        title: "Couldn't build audience",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });
}
