import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useGrants() {
  return useQuery({
    queryKey: ["grants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grants")
        .select("*")
        .order("fit_score", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useGrantApplications() {
  return useQuery({
    queryKey: ["grant_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grant_applications")
        .select("*, grants(*)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDiscoverGrants() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("discover-grants", { body: {} });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast({ title: "Discovery complete", description: `${data.discovered ?? 0} new grants found, ${data.skipped ?? 0} already in your list.` });
      qc.invalidateQueries({ queryKey: ["grants"] });
    },
    onError: (e: Error) => toast({ title: "Discovery failed", description: e.message, variant: "destructive" }),
  });
}

export function useQualifyGrant() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (grant_id: string) => {
      const { data, error } = await supabase.functions.invoke("qualify-grant", { body: { grant_id } });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Grant analyzed" });
      qc.invalidateQueries({ queryKey: ["grants"] });
    },
    onError: (e: Error) => toast({ title: "Analysis failed", description: e.message, variant: "destructive" }),
  });
}

export function useGenerateApplication() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (grant_id: string) => {
      const { data, error } = await supabase.functions.invoke("generate-grant-application", { body: { grant_id } });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast({ title: "Application drafted" });
      qc.invalidateQueries({ queryKey: ["grant_applications"] });
    },
    onError: (e: Error) => toast({ title: "Draft failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateGrant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase.from("grants").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grants"] }),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase.from("grant_applications").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["grant_applications"] }),
  });
}

export function useAddGrantManually() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { title: string; url: string; provider?: string; deadline?: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("grants")
        .insert({ ...input, user_id: user.id, source: "manual", status: "new" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Grant added" });
      qc.invalidateQueries({ queryKey: ["grants"] });
    },
    onError: (e: Error) => toast({ title: "Failed to add", description: e.message, variant: "destructive" }),
  });
}
