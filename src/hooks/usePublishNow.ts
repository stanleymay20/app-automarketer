import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePublishNow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contentId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/publish-now`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content_id: contentId }),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Publish failed");
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.success("Published to X!", {
        description: data.tweet_url ? "View your live tweet" : undefined,
        action: data.tweet_url
          ? { label: "View", onClick: () => window.open(data.tweet_url, "_blank") }
          : undefined,
      });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.error(`Publish failed: ${error.message}`);
    },
  });
}
