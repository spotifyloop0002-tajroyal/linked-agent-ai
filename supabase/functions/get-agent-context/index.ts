import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for broader access (user scoping done manually)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // First get user ID from the auth token
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log("📊 Fetching ALL agent context for user:", userId);

    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch ALL data in parallel — single round-trip
    const [profileRes, writingStyleRes, writingDnaRes, recentPostsRes, analyticsRes, referenceMaterialsRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_writing_style").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_writing_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("linkedin_post_history")
        .select("post_content, post_date, views, likes, comments, shares")
        .eq("user_id", userId)
        .order("post_date", { ascending: false })
        .limit(20),
      supabase.from("linkedin_analytics").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("agent_reference_materials")
        .select("title, content, type")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const profile = profileRes.data;
    const writingStyle = writingStyleRes.data;
    const writingDna = writingDnaRes.data;
    const recentPosts = recentPostsRes.data;
    const analytics = analyticsRes.data;
    const referenceMaterials = referenceMaterialsRes.data;

    // Build context object
    const agentContext = {
      profile: profile ? {
        name: profile.name,
        userType: profile.user_type,
        companyName: profile.company_name,
        industry: profile.industry,
        companyDescription: profile.company_description,
        targetAudience: profile.target_audience,
        location: profile.location,
        defaultTopics: profile.default_topics,
        role: profile.role,
        background: profile.background,
        postingGoals: profile.posting_goals,
        preferredTone: profile.preferred_tone,
      } : null,
      writingStyle: writingStyle ? {
        avgPostLength: writingStyle.avg_post_length,
        commonTopics: writingStyle.common_topics,
        toneAnalysis: writingStyle.tone_analysis,
        emojiUsage: writingStyle.emoji_usage,
        hashtagStyle: writingStyle.hashtag_style,
        totalPostsAnalyzed: writingStyle.total_posts_analyzed,
      } : null,
      writingDna: writingDna ? {
        toneType: writingDna.tone_type,
        avgPostLength: writingDna.avg_post_length,
        usesEmojis: writingDna.uses_emojis,
        emojiFrequency: writingDna.emoji_frequency,
        hookStyle: writingDna.hook_style,
        avgSentenceLength: writingDna.avg_sentence_length,
        usesBulletPoints: writingDna.uses_bullet_points,
        usesNumberedLists: writingDna.uses_numbered_lists,
        signaturePhrases: writingDna.signature_phrases,
        topicsHistory: writingDna.topics_history,
        samplePosts: writingDna.sample_posts,
        voiceTags: writingDna.voice_tags,
      } : null,
      recentPosts: recentPosts?.map(p => ({
        content: p.post_content?.substring(0, 500),
        date: p.post_date,
        engagement: {
          views: p.views || 0,
          likes: p.likes || 0,
          comments: p.comments || 0,
          shares: p.shares || 0,
        },
      })) || [],
      analytics: analytics ? {
        followersCount: analytics.followers_count,
        connectionsCount: analytics.connections_count,
        lastSynced: analytics.last_synced,
      } : null,
      referenceMaterials: referenceMaterials?.map(m => ({
        title: m.title,
        content: m.content?.substring(0, 500),
        type: m.type,
      })) || [],
      timestamp: new Date().toISOString(),
    };

    // Build AI instructions
    const aiInstructions = buildAIInstructions(agentContext);

    console.log("✅ Agent context compiled (profile + style + DNA + refs + analytics)");

    return new Response(
      JSON.stringify({
        success: true,
        context: agentContext,
        aiInstructions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Agent context error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildAIInstructions(context: any): string {
  const { profile, writingStyle, writingDna, recentPosts, referenceMaterials } = context;
  let instructions = "";

  // Profile context
  if (profile) {
    instructions += `USER PROFILE:\n`;
    instructions += `- Name: ${profile.name || "Unknown"}\n`;
    instructions += `- Type: ${profile.userType === "company" ? "Company Account" : "Personal Brand"}\n`;
    if (profile.userType === "company") {
      instructions += `- Company: ${profile.companyName || "N/A"}\n`;
      instructions += `- Industry: ${profile.industry || "N/A"}\n`;
      instructions += `- Description: ${profile.companyDescription || "N/A"}\n`;
    } else {
      instructions += `- Role: ${profile.role || "N/A"}\n`;
      instructions += `- Background: ${profile.background || "N/A"}\n`;
    }
    instructions += `- Target Audience: ${profile.targetAudience || "General professional audience"}\n`;
    instructions += `- Posting Goals: ${profile.postingGoals?.join(", ") || "Build presence"}\n`;
    instructions += `- Default Topics: ${profile.defaultTopics?.join(", ") || "General professional topics"}\n\n`;
  }

  // Writing style from analyzed posts
  if (writingStyle) {
    instructions += `WRITING STYLE ANALYSIS:\n`;
    instructions += `- Average post length: ${writingStyle.avgPostLength || 150} words\n`;
    instructions += `- Tone: ${writingStyle.toneAnalysis?.tone || "professional"}\n`;
    instructions += `- Uses emojis: ${writingStyle.emojiUsage ? "Yes" : "No"}\n`;
    instructions += `- Hashtag style: ${writingStyle.hashtagStyle || "moderate"}\n`;
    if (writingStyle.commonTopics?.length > 0) {
      instructions += `- Common topics: ${writingStyle.commonTopics.slice(0, 8).join(", ")}\n`;
    }
    instructions += `- Based on ${writingStyle.totalPostsAnalyzed || 0} analyzed posts\n\n`;
  }

  // Writing DNA profile
  if (writingDna) {
    instructions += `WRITING DNA PROFILE:\n`;
    instructions += `- Tone type: ${writingDna.toneType || "auto"}\n`;
    instructions += `- Hook style: ${writingDna.hookStyle || "question"}\n`;
    instructions += `- Avg sentence length: ${writingDna.avgSentenceLength || "medium"}\n`;
    instructions += `- Uses bullet points: ${writingDna.usesBulletPoints ? "Yes" : "No"}\n`;
    instructions += `- Uses numbered lists: ${writingDna.usesNumberedLists ? "Yes" : "No"}\n`;
    if (writingDna.signaturePhrases?.length > 0) {
      instructions += `- Signature phrases: ${writingDna.signaturePhrases.join(", ")}\n`;
    }
    instructions += `\n`;
  }

  // Recent post examples
  if (recentPosts?.length > 0) {
    instructions += `RECENT POST EXAMPLES (match this style):\n`;
    recentPosts.slice(0, 5).forEach((post: any, idx: number) => {
      const preview = post.content?.substring(0, 150) || "";
      instructions += `${idx + 1}. "${preview}..."\n`;
    });
    instructions += `\n`;
  }

  // Reference materials
  if (referenceMaterials?.length > 0) {
    instructions += `USER REFERENCE MATERIALS (Use these to match their style):\n`;
    referenceMaterials.forEach((m: any) => {
      instructions += `[${m.type?.toUpperCase()}] ${m.title}:\n${m.content}\n\n`;
    });
  }

  // Requirements
  instructions += `REQUIREMENTS:\n`;
  instructions += `- Match the user's writing style and voice\n`;
  if (writingStyle?.avgPostLength) {
    instructions += `- Target length: around ${writingStyle.avgPostLength} words\n`;
  }
  if (profile?.targetAudience) {
    instructions += `- Write for audience: ${profile.targetAudience}\n`;
  }

  return instructions;
}
