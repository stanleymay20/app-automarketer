import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserSettings } from "@/hooks/useUserSettings";

export function usePublishNow() {
  const queryClient = useQueryClient();
  const { data: settings } = useUserSettings();

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
      if (settings?.notification_post_published !== false) {
        const url = data.post_url || data.tweet_url;
        toast.success("Published successfully!", {
          description: url ? "View your live post" : undefined,
          action: url
            ? { label: "View", onClick: () => window.open(url, "_blank") }
            : undefined,
        });
      }
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast.error(`Publish failed: ${error.message}`);
    },
  });
}
