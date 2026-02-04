import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";
import { App } from "@/hooks/useApps";
import { addDays, addHours, setHours, setMinutes } from "date-fns";

interface GeneratedPost {
  platform: string;
  content: string;
}

export function useGenerateContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: settings } = useUserSettings();
  const [isGenerating, setIsGenerating] = useState(false);

  const mutation = useMutation({
    mutationFn: async (app: App) => {
      if (!app.platforms || app.platforms.length === 0) {
        throw new Error("Please select at least one platform for this app");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          app: {
            name: app.name,
            description: app.description,
            target_audience: app.target_audience,
            brand_tone: app.brand_tone,
            platforms: app.platforms,
          },
          postsPerPlatform: 2,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const posts = data.posts as GeneratedPost[];
      
      // Determine status based on mode
      const status = settings?.autopilot_mode ? "approved" : "pending";
      
      // Create scheduled dates (spread across next 7 days)
      const now = new Date();
      const contentToInsert = posts.map((post, index) => {
        const scheduledDate = addDays(now, Math.floor(index / 2) + 1);
        const scheduledTime = setMinutes(setHours(scheduledDate, 9 + (index % 3) * 4), 0);
        
        return {
          app_id: app.id,
          user_id: user.id,
          platform: post.platform,
          content_text: post.content,
          status,
          scheduled_for: scheduledTime.toISOString(),
        };
      });

      // Insert content into database
      const { data: insertedContent, error: insertError } = await supabase
        .from("content")
        .insert(contentToInsert)
        .select();

      if (insertError) throw insertError;

      // Update app posts count
      await supabase
        .from("apps")
        .update({ posts_count: (app.posts_count || 0) + posts.length })
        .eq("id", app.id);

      return insertedContent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      toast({
        title: "Content generated!",
        description: `${data.length} posts created and ${settings?.autopilot_mode ? "approved for publishing" : "waiting for approval"}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      });
    },
  });

  return {
    generateContent: mutation.mutateAsync,
    isGenerating: mutation.isPending,
  };
}
