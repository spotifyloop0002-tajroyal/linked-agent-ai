import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WritingDNA {
  id: string;
  user_id: string;
  tone_type: string;
  avg_post_length: number;
  uses_emojis: boolean;
  emoji_frequency: string;
  hook_style: string;
  avg_sentence_length: string;
  uses_bullet_points: boolean;
  uses_numbered_lists: boolean;
  signature_phrases: string[];
  topics_history: string[];
  sample_posts: any[];
  voice_tags: any;
  created_at: string;
  updated_at: string;
}

export function useWritingDNA() {
  const [dna, setDna] = useState<WritingDNA | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const fetchDNA = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("user_writing_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setDna(data as unknown as WritingDNA | null);
    } catch (error) {
      console.error("Error fetching Writing DNA:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzePosts = useCallback(async (samplePosts: string[]) => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-writing-dna", {
        body: { samplePosts },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      toast.success("Writing DNA profile created!");
      await fetchDNA();
      return data.dna;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to analyze posts";
      toast.error(msg);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [fetchDNA]);

  const updateDNA = useCallback(async (updates: Partial<WritingDNA>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_writing_profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);

      if (error) throw error;
      await fetchDNA();
      toast.success("Writing DNA updated");
    } catch (error) {
      toast.error("Failed to update Writing DNA");
    }
  }, [fetchDNA]);

  useEffect(() => {
    fetchDNA();
  }, [fetchDNA]);

  return { dna, isLoading, isAnalyzing, fetchDNA, analyzePosts, updateDNA };
}
