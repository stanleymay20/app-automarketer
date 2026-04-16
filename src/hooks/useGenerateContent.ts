import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";
import { usePlanLimits } from "@/hooks/usePlanLimits";
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
  const { data: planLimits } = usePlanLimits();
  const [isGenerating, setIsGenerating] = useState(false);

  const mutation = useMutation({
    mutationFn: async (input: App | { app: App; topic?: string }) => {
      const app: App = "app" in input ? input.app : input;
      const topic: string | undefined = "app" in input ? input.topic : undefined;

      if (!app.platforms || app.platforms.length === 0) {
        throw new Error("Please select at least one platform for this app");
      }

      // Check plan limits before generating
      if (!planLimits?.canCreatePost) {
        const remainingPosts = planLimits?.postsRemaining || 0;
        throw new Error(
          `You've reached your monthly post limit. ${remainingPosts === 0 ? "Upgrade your plan to continue." : `${remainingPosts} post(s) remaining this month.`}`
        );
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
          topic: topic?.trim() || undefined,
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
        
        // Normalize platform to lowercase (AI may return "X", "LinkedIn", etc.)
        const normalizedPlatform = post.platform.toLowerCase()
          .replace("x (twitter)", "x")
          .replace("twitter", "x");
        
        return {
          app_id: app.id,
          user_id: user.id,
          platform: normalizedPlatform,
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

      // Generate images and score posts in parallel (fire-and-forget)
      for (const item of insertedContent || []) {
        // Quality gate
        supabase.functions.invoke("quality-gate", {
          body: {
            content_id: item.id,
            content_text: item.content_text,
            platform: item.platform,
            app_id: item.app_id,
            user_id: user.id,
          },
        }).catch((err) => console.error("Quality gate error:", err));

        // Generate post image
        supabase.functions.invoke("generate-post-image", {
          body: {
            contentId: item.id,
            contentText: item.content_text,
            appName: app.name,
            platform: item.platform,
          },
        }).catch((err) => console.error("Image generation error:", err));
      }

      // Update app posts count
      await supabase
        .from("apps")
        .update({ posts_count: (app.posts_count || 0) + posts.length })
        .eq("id", app.id);

      // Increment posts_this_month counter
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase
          .from("user_settings")
          .update({ posts_this_month: (settings?.posts_this_month || 0) + posts.length })
          .eq("user_id", currentUser.id);
      }

      return insertedContent;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      queryClient.invalidateQueries({ queryKey: ["plan-limits"] });
      if (settings?.notification_content_ready !== false) {
        toast({
          title: "Content generated!",
          description: `${data.length} posts created and ${settings?.autopilot_mode ? "approved for publishing" : "waiting for approval"}.`,
        });
      }
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
