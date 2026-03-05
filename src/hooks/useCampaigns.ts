import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Campaign {
  id: string;
  user_id: string;
  topic: string;
  tone_type: string;
  duration_type: string;
  start_date: string;
  end_date: string;
  post_count: number;
  posts_per_day: number;
  research_mode: boolean;
  auto_best_time: boolean;
  auto_approve: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  content_length: string;
  emoji_level: string;
  hashtag_mode: string;
  fixed_hashtags: string[];
  footer_text: string;
  image_option: string;
  posting_time: string;
}

export interface CampaignFormData {
  topic: string;
  toneType: string;
  durationType: "7_days" | "alternate" | "custom";
  startDate: Date;
  endDate?: Date;
  postCount?: number;
  postsPerDay: number;
  researchMode: boolean;
  autoBestTime: boolean;
  autoApprove: boolean;
  postingTime?: string;
  contentLength: string;
  emojiLevel: string;
  hashtagMode: string;
  fixedHashtags: string[];
  footerText: string;
  imageOption: string;
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns((data || []) as unknown as Campaign[]);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (formData: CampaignFormData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const startDate = formData.startDate;
      let endDate: Date;
      let postCount: number;

      if (formData.durationType === "7_days") {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        postCount = 7;
      } else if (formData.durationType === "alternate") {
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 13);
        postCount = 7;
      } else {
        endDate = formData.endDate || new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        postCount = formData.postCount || totalDays;
      }

      const { data, error } = await supabase
        .from("campaigns")
        .insert({
          user_id: session.user.id,
          topic: formData.topic,
          tone_type: formData.toneType,
          duration_type: formData.durationType,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          post_count: postCount,
          research_mode: formData.researchMode,
          auto_best_time: formData.autoBestTime,
          auto_approve: formData.autoApprove,
          posting_time: formData.postingTime || "09:00",
          posts_per_day: formData.postsPerDay || 1,
          content_length: formData.contentLength,
          emoji_level: formData.emojiLevel,
          hashtag_mode: formData.hashtagMode,
          fixed_hashtags: formData.fixedHashtags,
          footer_text: formData.footerText,
          image_option: formData.imageOption,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Campaign created! Generating posts...");
      return data as unknown as Campaign;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create campaign";
      toast.error(msg);
      return null;
    }
  }, []);

  const generateCampaignPosts = useCallback(async (campaignId: string) => {
    if (isGenerating) {
      toast.info("Generation already in progress, please wait...");
      return false;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign", {
        body: { campaignId },
      });

      if (error) {
        let msg = "Failed to generate posts";
        try {
          const ctx = await (error as any)?.context?.json?.();
          if (ctx?.error) msg = ctx.error;
        } catch {
          if (error.message && error.message !== "Edge Function returned a non-2xx status code") {
            msg = error.message;
          }
        }
        toast.error(msg);
        return false;
      }

      if (data?.error) {
        toast.error(data.error);
        return false;
      }

      toast.success(`Generated ${data.postsGenerated} posts!`);
      await fetchCampaigns();
      return true;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to generate posts";
      toast.error(msg);
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [fetchCampaigns, isGenerating]);

  const updateCampaignStatus = useCallback(async (campaignId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ status })
        .eq("id", campaignId);

      if (error) throw error;
      await fetchCampaigns();
      toast.success(`Campaign ${status}`);
    } catch (error) {
      toast.error("Failed to update campaign");
    }
  }, [fetchCampaigns]);

  const deleteCampaign = useCallback(async (campaignId: string) => {
    try {
      await supabase.from("posts").delete().eq("campaign_id", campaignId);
      const { error } = await supabase.from("campaigns").delete().eq("id", campaignId);
      if (error) throw error;
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      toast.success("Campaign deleted");
    } catch (error) {
      toast.error("Failed to delete campaign");
    }
  }, []);

  const approveCampaignPosts = useCallback(async (campaignId: string) => {
    try {
      const { error } = await supabase
        .from("posts")
        .update({ status: "pending" })
        .eq("campaign_id", campaignId)
        .eq("status", "draft");

      if (error) throw error;

      await supabase.from("campaigns").update({ status: "active" }).eq("id", campaignId);
      await fetchCampaigns();
      toast.success("All posts approved and scheduled!");
    } catch (error) {
      toast.error("Failed to approve posts");
    }
  }, [fetchCampaigns]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Realtime subscription removed — it was unfiltered (triggered on ALL users' campaign changes)
  // and caused unnecessary refetches. Campaign data is fetched on mount and after mutations.

  return {
    campaigns,
    isLoading,
    isGenerating,
    fetchCampaigns,
    createCampaign,
    generateCampaignPosts,
    updateCampaignStatus,
    deleteCampaign,
    approveCampaignPosts,
  };
}
