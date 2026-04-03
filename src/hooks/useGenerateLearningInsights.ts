import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useGenerateLearningInsights() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (appId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("generate-learning-insights", {
        body: { app_id: appId, user_id: user.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["learning_insights"] });
      toast({
        title: "Insights generated",
        description: `${data.count} new learning insights created.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Insight generation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
