import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Best posting times in IST (hours in 24h format)
const BEST_TIMES_IST = [8, 9, 10, 12, 14, 17, 18];

function pickBestTime(dayIndex: number): { hour: number; minute: number } {
  const hour = BEST_TIMES_IST[dayIndex % BEST_TIMES_IST.length];
  const minute = Math.random() > 0.5 ? 0 : 30;
  return { hour, minute };
}

function parsePostingTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hour: h || 9, minute: m || 0 };
}

// Writing DNA tone prompts
const TONE_PROMPTS: Record<string, string> = {
  professional: `Write in a Professional voice. Authoritative, clear, and formal. No slang, no overly casual language. Demonstrate expertise and credibility.`,
  storyteller: `Write in a Storytelling Founder voice. Open with a personal memory or timeline. Use "I thought... but then I learned..." pattern. Be vulnerable, warm, reflective. Medium length, no bullet points.`,
  analyst: `Write in a Data-Driven Analyst voice. Open with a statistic or surprising number. Use percentages, comparisons, trend data. Objective tone, minimal personal opinion. End with "so what does this mean?"`,
  creator: `Write in a Conversational Creator voice. Short punchy sentences. Talk directly to reader ("You're doing this wrong"). Relatable, slightly provocative, casual. Heavy white space and line breaks.`,
  motivator: `Write in a Motivational Builder voice. Bold one-liner openers. Use contrast ("X won't save you. Y will."). Inspirational, direct, calls to action. Short posts, maximum impact.`,
  educator: `Write in an Educational Breakdown voice. Structured with numbered or labeled sections. "Here's how X works: 1. ... 2. ... 3. ..." Authority voice, helpful, informative. End with a forward-looking statement.`,
  casual: `Write in a Casual, friendly voice. Relaxed tone, like talking to a friend. Use contractions, informal language. Warm and approachable.`,
  auto: `Write in a professional, engaging LinkedIn voice. Vary between storytelling, data-driven insights, and conversational styles across different posts.`,
};

const CONTENT_LENGTH_RULES: Record<string, string> = {
  short: "Keep each post between 100-150 words. Be concise and impactful.",
  medium: "Keep each post between 200-300 words. Good balance of depth and readability.",
  long: "Write detailed posts of 400+ words. Deep insights, thorough coverage.",
};

const EMOJI_RULES: Record<string, string> = {
  none: "Do NOT use any emojis at all.",
  low: "Use 1-2 emojis per post, sparingly and strategically.",
  moderate: "Use 3-5 emojis per post to add visual interest.",
  high: "Use emojis liberally throughout the post for engagement and visual appeal.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaignId } = await req.json();
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign
    const { data: campaign, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .eq("user_id", user.id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update campaign status to generating
    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    // Fetch user profile for personalization
    const { data: profile } = await supabase
      .from("user_profiles_safe")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Fetch Writing DNA profile
    const { data: writingDna } = await supabase
      .from("user_writing_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // Calculate posting dates
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const postDates: Date[] = [];

    if (campaign.duration_type === "alternate") {
      let current = new Date(startDate);
      while (current <= endDate && postDates.length < campaign.post_count) {
        postDates.push(new Date(current));
        current.setDate(current.getDate() + 2);
      }
    } else {
      let current = new Date(startDate);
      while (current <= endDate && postDates.length < campaign.post_count) {
        postDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }

    // Research if enabled
    let researchInsights = "";
    if (campaign.research_mode) {
      const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");
      if (TAVILY_API_KEY) {
        try {
          const res = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: TAVILY_API_KEY,
              query: `Latest trends and insights about ${campaign.topic} for LinkedIn`,
              search_depth: "basic",
              max_results: 5,
            }),
          });
          const data = await res.json();
          if (data.results?.length > 0) {
            researchInsights = "\n\nLATEST RESEARCH:\n" +
              data.results.map((r: any) => `- ${r.content?.substring(0, 200)}`).join("\n");
          }
        } catch (e) {
          console.error("Research failed, continuing without:", e);
        }
      }
    }

    // Build the tone prompt
    const toneType = writingDna?.tone_type || campaign.tone_type || "auto";
    const tonePrompt = TONE_PROMPTS[toneType] || TONE_PROMPTS.auto;

    // Content settings from campaign
    const contentLengthRule = CONTENT_LENGTH_RULES[campaign.content_length || "medium"] || CONTENT_LENGTH_RULES.medium;
    const emojiRule = EMOJI_RULES[campaign.emoji_level || "moderate"] || EMOJI_RULES.moderate;

    // Hashtag rules
    let hashtagRule = "";
    if (campaign.hashtag_mode === "none") {
      hashtagRule = "Do NOT include any hashtags.";
    } else if (campaign.hashtag_mode === "manual" && campaign.fixed_hashtags?.length > 0) {
      hashtagRule = `Always include these hashtags at the end: ${campaign.fixed_hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ")}`;
    } else {
      hashtagRule = "Add 3-5 relevant hashtags at the end of each post.";
    }

    // Footer
    const footerRule = campaign.footer_text
      ? `\nIMPORTANT: Append this exact footer at the end of every post (after a blank line):\n"${campaign.footer_text}"\nDo NOT modify or paraphrase the footer. Do NOT duplicate it if the content already ends with similar text.`
      : "";

    // Build DNA context
    let dnaContext = "";
    if (writingDna) {
      dnaContext = `
USER WRITING DNA:
- Tone: ${writingDna.tone_type}
- Avg length: ${writingDna.avg_post_length} words
- Uses emojis: ${writingDna.uses_emojis} (${writingDna.emoji_frequency})
- Hook style: ${writingDna.hook_style}
- Sentence length: ${writingDna.avg_sentence_length}
- Uses bullet points: ${writingDna.uses_bullet_points}
- Uses numbered lists: ${writingDna.uses_numbered_lists}
${writingDna.signature_phrases?.length ? `- Signature phrases: ${writingDna.signature_phrases.join(", ")}` : ""}`;
    }

    // Generate all posts with Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are a LinkedIn content expert generating a campaign of ${postDates.length} posts about "${campaign.topic}".

${tonePrompt}

USER PROFILE:
- Name: ${profile?.name || "Professional"}
- Role: ${profile?.role || "Professional"}
- Company: ${profile?.company_name || ""}
- Industry: ${profile?.industry || ""}
- Location: ${profile?.location || ""}
${dnaContext}
${researchInsights}

CONTENT RULES:
1. Each post MUST be unique with a different angle on the topic
2. Vary post structure across the campaign (hooks, stories, data, questions)
3. Write as the user, not as an AI
4. ${contentLengthRule}
5. ${emojiRule}
6. ${hashtagRule}
7. Make each post a standalone piece that can be read independently
8. Number each post clearly as "Post 1:", "Post 2:", etc.
${footerRule}

Generate exactly ${postDates.length} LinkedIn posts. Separate each with "---POST_SEPARATOR---"`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${postDates.length} LinkedIn posts about "${campaign.topic}". Each post should have a different angle. Separate posts with "---POST_SEPARATOR---"` },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);

      if (aiResponse.status === 429) {
        await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const fullContent = aiData.choices?.[0]?.message?.content || "";

    // Parse posts
    const rawPosts = fullContent
      .split("---POST_SEPARATOR---")
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 20);

    if (rawPosts.length === 0) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      return new Response(JSON.stringify({ error: "Failed to generate posts" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean post content (remove "Post 1:" prefixes)
    const cleanPosts = rawPosts.map((p: string) =>
      p.replace(/^Post\s*\d+\s*:\s*/i, "").trim()
    );

    // Create posts in database with proper timezone handling
    const postsToInsert = cleanPosts.slice(0, postDates.length).map((content: string, i: number) => {
      const postDate = postDates[i];
      
      let hour: number, minute: number;
      if (campaign.auto_best_time) {
        ({ hour, minute } = pickBestTime(i));
      } else {
        // Use user's selected posting time (in IST)
        ({ hour, minute } = parsePostingTime(campaign.posting_time || "09:00"));
      }

      // Create scheduled time: postDate at hour:minute IST → UTC
      // IST is UTC+5:30 (330 minutes). Convert by subtracting offset in ms.
      const scheduledTime = new Date(postDate);
      scheduledTime.setUTCHours(0, 0, 0, 0); // Reset to midnight UTC
      const istOffsetMs = 5.5 * 60 * 60 * 1000; // 5h30m in milliseconds
      const timeOfDayMs = (hour * 60 + minute) * 60 * 1000;
      const finalMs = scheduledTime.getTime() + timeOfDayMs - istOffsetMs;
      const finalScheduledTime = new Date(finalMs);

      console.log(`[TZ] Post ${i}: ${hour}:${String(minute).padStart(2, '0')} IST → ${finalScheduledTime.toISOString()} UTC`);

      return {
        user_id: user.id,
        campaign_id: campaignId,
        content,
        scheduled_time: finalScheduledTime.toISOString(),
        status: campaign.auto_approve ? "pending" : "draft",
        retry_count: 0,
      };
    });

    const { data: createdPosts, error: insertErr } = await supabase
      .from("posts")
      .insert(postsToInsert)
      .select();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      throw insertErr;
    }

    // Update campaign status
    await supabase.from("campaigns").update({
      status: campaign.auto_approve ? "active" : "draft",
      post_count: createdPosts?.length || postsToInsert.length,
    }).eq("id", campaignId);

    return new Response(JSON.stringify({
      success: true,
      postsGenerated: createdPosts?.length || postsToInsert.length,
      campaignId,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Campaign generation error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
