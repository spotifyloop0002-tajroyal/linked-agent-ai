import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AGENT_TYPE_PROMPTS: Record<string, { style: string; emoji: string }> = {
  comedy: { style: "Write funny, relatable LinkedIn posts. Use humor to make a point.", emoji: "Use humor emojis like 😂🤣💀🫠 sparingly" },
  professional: { style: "Write authoritative industry analysis posts. Professional but not boring.", emoji: "Minimal emojis. Use 📊📈💡 only at paragraph starts" },
  storytelling: { style: "Write personal stories with a narrative arc: setup → conflict → resolution → lesson.", emoji: "Warm emojis like ❤️🙏✨🌟" },
  "thought-leadership": { style: "Write posts with strong, sometimes contrarian opinions. Challenge conventional thinking.", emoji: "Strategic emojis like 🔥💡🎯⚡" },
  motivational: { style: "Write posts that motivate people to take action. Share lessons from failures and wins.", emoji: "Energetic emojis like 🚀💪🔥✨🌟" },
  "data-analytics": { style: "Write posts built around compelling statistics and data.", emoji: "Data emojis like 📊📈🔢📉" },
  creative: { style: "Write posts about creative thinking, design principles, and innovation.", emoji: "Creative emojis like 🎨✨🎭🌈" },
  news: { style: "Write posts analyzing latest industry news and trends.", emoji: "News emojis like 🗞️📰🔔⚡" },
};

const CONTENT_LENGTH_RULES: Record<string, string> = {
  short: "Keep the post between 100-150 words.",
  medium: "Keep the post between 200-300 words.",
  long: "Write a detailed post of 400+ words.",
};

const EMOJI_RULES: Record<string, string> = {
  none: "Do NOT use any emojis at all.",
  low: "Use only 1-2 relevant emojis.",
  moderate: "Use 3-5 relevant emojis.",
  high: "Use emojis frequently throughout (8+).",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { postId } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: "postId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch the post and its campaign
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("id, content, campaign_id, user_id")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch campaign details
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("topic, agent_type, tone_type, content_length, emoji_level, hashtag_mode, fixed_hashtags, footer_text")
      .eq("id", post.campaign_id)
      .single();

    // Fetch user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("name, role, company_name, industry, location")
      .eq("user_id", user.id)
      .single();

    const agentType = campaign?.agent_type || campaign?.tone_type || "professional";
    const agentConfig = AGENT_TYPE_PROMPTS[agentType] || AGENT_TYPE_PROMPTS.professional;
    const contentLengthRule = CONTENT_LENGTH_RULES[campaign?.content_length || "medium"] || CONTENT_LENGTH_RULES.medium;
    const emojiRule = EMOJI_RULES[campaign?.emoji_level || "moderate"] || EMOJI_RULES.moderate;

    let hashtagRule = "Add 3-5 relevant hashtags at the end. ALWAYS include #LinkedBot as the very last hashtag.";
    if (campaign?.hashtag_mode === "none") {
      hashtagRule = "Add ONLY #LinkedBot as the last line.";
    } else if (campaign?.hashtag_mode === "manual" && campaign?.fixed_hashtags?.length > 0) {
      const userHashtags = campaign.fixed_hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
      hashtagRule = `Always include these hashtags at the end: ${userHashtags} #LinkedBot`;
    }

    const footerRule = campaign?.footer_text
      ? `\nAppend this exact footer at the end (after a blank line): "${campaign.footer_text}"`
      : "";

    // Extract topic - handle multi-topic format
    const topicStr = campaign?.topic || "professional insights";
    const topicsList = topicStr.includes("|||") ? topicStr.split("|||").map((t: string) => t.trim()).filter(Boolean) : [topicStr];
    const randomTopic = topicsList[Math.floor(Math.random() * topicsList.length)];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are the content generation engine for LinkedBot — a LinkedIn automation SaaS.

AGENT TYPE: ${agentType.toUpperCase()}
${agentConfig.style}
EMOJI STYLE: ${agentConfig.emoji}

USER PROFILE:
- Name: ${profile?.name || "Professional"}
- Role: ${profile?.role || "Professional"}
- Company: ${profile?.company_name || ""}
- Industry: ${profile?.industry || ""}
- Location: ${profile?.location || ""}

CONTENT RULES:
1. ${contentLengthRule}
2. ${emojiRule}
3. ${hashtagRule}
4. Write as the user, not as an AI
${footerRule}

FORMATTING RULES:
- Use DOUBLE line breaks between EVERY paragraph
- Keep paragraphs to 1-2 sentences max
- Start with a strong hook
- Use bullet points (•) when listing ideas
- End with a clear takeaway or call-to-action
- ALWAYS end with #LinkedBot as the very last hashtag

HUMANIZATION:
- Use contractions naturally
- Be conversational
- BANNED: "Let me share", "In conclusion", "Furthermore", "Moreover", "leverage", "synergy"
- Mix short and long sentences for rhythm

Generate exactly ONE LinkedIn post. Return ONLY the post content, no labels or numbering.`;

    const userPrompt = `Write a completely NEW and DIFFERENT LinkedIn post about "${randomTopic}" using the ${agentType} style. Make it unique — do NOT repeat the previous version:\n\nPREVIOUS VERSION (write something completely different):\n${post.content.substring(0, 300)}...`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let newContent = aiData.choices?.[0]?.message?.content || "";
    newContent = newContent.replace(/^Post\s*\d+\s*:\s*/i, "").trim();

    if (!newContent || newContent.length < 20) {
      return new Response(JSON.stringify({ error: "Failed to generate new content" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update the post
    const { error: updateError } = await supabase
      .from("posts")
      .update({ content: newContent })
      .eq("id", postId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to save regenerated post" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, content: newContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Regenerate error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
