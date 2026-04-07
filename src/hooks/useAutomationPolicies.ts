import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AutomationPolicy {
  id: string;
  user_id: string;
  auto_approve_enabled: boolean;
  auto_publish_enabled: boolean;
  auto_publish_time: string | null;
  min_quality_score: number;
  max_posts_per_day: number;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  escalation_mode: string;
  created_at: string;
  updated_at: string;
}

export function useAutomationPolicy() {
  return useQuery({
    queryKey: ["automation_policy"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from("automation_policies")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newPolicy, error: insertError } = await supabase
          .from("automation_policies")
          .insert({ user_id: user.id })
          .select()
          .single();
        if (insertError) throw insertError;
        return newPolicy as AutomationPolicy;
      }

      return data as AutomationPolicy;
    },
  });
}

export function useUpdateAutomationPolicy() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<AutomationPolicy, "id" | "user_id" | "created_at" | "updated_at">>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("automation_policies")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as AutomationPolicy;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation_policy"] });
      toast({ title: "Policy updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
