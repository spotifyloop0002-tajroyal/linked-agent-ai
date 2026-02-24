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
  research_mode: boolean;
  auto_best_time: boolean;
  auto_approve: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignFormData {
  topic: string;
  toneType: string;
  durationType: "7_days" | "alternate" | "custom";
  startDate: Date;
  endDate?: Date;
  postCount?: number;
  researchMode: boolean;
  autoBestTime: boolean;
  autoApprove: boolean;
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Calculate dates
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
          user_id: user.id,
          topic: formData.topic,
          tone_type: formData.toneType,
          duration_type: formData.durationType,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          post_count: postCount,
          research_mode: formData.researchMode,
          auto_best_time: formData.autoBestTime,
          auto_approve: formData.autoApprove,
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
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-campaign", {
        body: { campaignId },
      });

      if (error) throw error;

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
  }, [fetchCampaigns]);

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
      // Delete associated posts first
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
      // Update all draft posts in this campaign to pending
      const { error } = await supabase
        .from("posts")
        .update({ status: "pending" })
        .eq("campaign_id", campaignId)
        .eq("status", "draft");

      if (error) throw error;

      // Update campaign to active
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("campaigns-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaigns" }, () => {
        fetchCampaigns();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCampaigns]);

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
