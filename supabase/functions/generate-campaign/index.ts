import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Agent type configurations for post generation
const AGENT_TYPE_PROMPTS: Record<string, { style: string; emoji: string; imageStyle: string; suggestedHour: number }> = {
  comedy: {
    style: "Write funny, relatable LinkedIn posts. Use humor to make a point. Include a twist or punchline. Be genuinely funny like a comedian who works in tech. Self-deprecating humor works great.",
    emoji: "Use humor emojis like 😂🤣💀🫠 sparingly for punchlines",
    imageStyle: "meme-style, cartoon, funny reaction images",
    suggestedHour: 21,
  },
  professional: {
    style: "Write authoritative industry analysis posts. Share expert insights with data backing. Professional but not boring — be the smartest person in the room without being arrogant.",
    emoji: "Minimal emojis. Use 📊📈💡 only at paragraph starts for scannability",
    imageStyle: "minimal business graphics, clean professional design",
    suggestedHour: 10,
  },
  storytelling: {
    style: "Write personal stories with a clear narrative arc: setup → conflict → resolution → lesson. Be vulnerable and authentic. Every story should teach something. Use 'I' and share real experiences.",
    emoji: "Warm emojis like ❤️🙏✨🌟 to enhance emotional moments",
    imageStyle: "emotional visual scenes, cinematic moments",
    suggestedHour: 12,
  },
  "thought-leadership": {
    style: "Write posts with strong, sometimes contrarian opinions. Challenge conventional thinking. Start with a bold claim, then back it up. Be the industry voice people follow for hot takes.",
    emoji: "Strategic emojis like 🔥💡🎯⚡ for emphasis on key points",
    imageStyle: "bold typography graphics, quote cards, futuristic design",
    suggestedHour: 11,
  },
  motivational: {
    style: "Write posts that motivate people to take action. Share lessons from failures and wins. Use power words. End with a call-to-action or challenge. Morning energy vibes.",
    emoji: "Energetic emojis like 🚀💪🔥✨🌟 throughout for energy",
    imageStyle: "sunrise/nature scenes, achievement moments, inspirational",
    suggestedHour: 8,
  },
  "data-analytics": {
    style: "Write posts built around compelling statistics and data. Lead with a surprising number. Break down complex data into simple insights. Use bullet points for key stats.",
    emoji: "Data emojis like 📊📈🔢📉 at key stat callouts",
    imageStyle: "charts, graphs, data visualizations, infographic style",
    suggestedHour: 16,
  },
  creative: {
    style: "Write posts about creative thinking, design principles, and innovation. Use vivid metaphors and visual language. Share creative processes and 'aha' moments.",
    emoji: "Creative emojis like 🎨✨🎭🌈 to match artistic tone",
    imageStyle: "AI illustrations, abstract art, creative designs",
    suggestedHour: 19,
  },
  news: {
    style: "Write posts analyzing latest industry news and trends. Be the first to break down what a development means. Add your own take on why it matters.",
    emoji: "News emojis like 🗞️📰🔔⚡ for urgency and relevance",
    imageStyle: "headline-style news graphics, breaking news format",
    suggestedHour: 9,
  },
};

const DEFAULT_CAMPAIGN_TIMEZONE = "Asia/Kolkata";

// Best posting hours in campaign timezone (24h format)
const BEST_TIMES_LOCAL = [8, 9, 10, 12, 14, 17, 18];

const COUNTRY_TIMEZONE_FALLBACKS: Record<string, string> = {
  india: "Asia/Kolkata",
  bharat: "Asia/Kolkata",
  "united kingdom": "Europe/London",
  uk: "Europe/London",
  "united states": "America/New_York",
  usa: "America/New_York",
  "united arab emirates": "Asia/Dubai",
  uae: "Asia/Dubai",
};

function normalizeCountryName(country?: string | null): string {
  return (country || "").trim().toLowerCase();
}

async function resolveTimezoneFromCountry(country?: string | null): Promise<string> {
  const normalizedCountry = normalizeCountryName(country);

  if (!normalizedCountry) {
    return DEFAULT_CAMPAIGN_TIMEZONE;
  }

  if (COUNTRY_TIMEZONE_FALLBACKS[normalizedCountry]) {
    return COUNTRY_TIMEZONE_FALLBACKS[normalizedCountry];
  }

  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(country || "")}?fields=name,timezones`
    );

    if (response.ok) {
      const countries = await response.json() as Array<{ name?: { common?: string }; timezones?: string[] }>;
      if (Array.isArray(countries) && countries.length > 0) {
        const exactMatch = countries.find((entry) =>
          normalizeCountryName(entry?.name?.common) === normalizedCountry
        );
        const timezone = exactMatch?.timezones?.[0] || countries[0]?.timezones?.[0];
        if (timezone) {
          return timezone;
        }
      }
    }
  } catch (error) {
    console.warn("Failed to resolve country timezone, using default:", error);
  }

  return DEFAULT_CAMPAIGN_TIMEZONE;
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const values = parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  const asUTC = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour) % 24,
    Number(values.minute),
    Number(values.second)
  );

  return asUTC - date.getTime();
}

function convertCountryLocalToUTC(dateKey: string, hour: number, minute: number, timeZone: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const targetWallClockMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);

  let utcMs = targetWallClockMs;
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = targetWallClockMs - offset;
  }

  return new Date(utcMs);
}

function pickBestTime(dayIndex: number, agentType?: string): { hour: number; minute: number } {
  const agentConfig = agentType ? AGENT_TYPE_PROMPTS[agentType] : null;
  const hour = agentConfig?.suggestedHour || BEST_TIMES_LOCAL[dayIndex % BEST_TIMES_LOCAL.length];
  const minute = Math.random() > 0.5 ? 0 : 30;
  return { hour, minute };
}

function parsePostingTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hour: h || 9, minute: m || 0 };
}

const CONTENT_LENGTH_RULES: Record<string, string> = {
  short: "Keep each post between 100-150 words. Be concise and impactful. Every word must earn its place.",
  medium: "Keep each post between 200-300 words. Good balance of depth and readability.",
  long: "Write detailed posts of 400+ words. Deep insights, thorough coverage.",
};

const EMOJI_RULES: Record<string, string> = {
  none: "Do NOT use any emojis at all. Zero emojis.",
  low: "Use only 1-2 relevant emojis per post. Place them only at the most impactful moments.",
  moderate: "Use 3-5 relevant emojis per post. Start key paragraphs or bullet points with emojis to add visual energy and scannability.",
  high: "Use emojis frequently and naturally throughout the post (8+). Almost every paragraph or bullet should start with a relevant emoji. Make the post visually rich and expressive.",
};

async function fetchUnifiedContext(authHeader: string): Promise<any | null> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const response = await fetch(`${supabaseUrl}/functions/v1/get-agent-context`, {
      method: "GET",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log("✅ Unified context loaded for campaign");
        return data;
      }
    }
  } catch (error) {
    console.error("Failed to fetch unified context:", error);
  }
  return null;
}

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

    const [campaignRes, unifiedContext] = await Promise.all([
      supabase.from("campaigns").select("*").eq("id", campaignId).eq("user_id", user.id).single(),
      fetchUnifiedContext(authHeader),
    ]);

    const campaign = campaignRes.data;
    if (campaignRes.error || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check LinkedIn connection
    const ctx = unifiedContext?.context || {};
    const linkedinConnected = ctx.linkedinConnected === true;
    if (!linkedinConnected) {
      return new Response(JSON.stringify({ 
        error: "LinkedIn is not connected. Please connect your LinkedIn account from the LinkedIn page before creating a campaign." 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    // --- SERVER-SIDE PLAN LIMIT CHECK ---
    const PLAN_LIMITS: Record<string, number> = { free: 5, pro: 60, business: 100, custom: 9999 };
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("subscription_plan, country, timezone")
      .eq("user_id", user.id)
      .single();
    const userPlan = userProfile?.subscription_plan || "free";
    const planLimit = PLAN_LIMITS[userPlan] || 5;
    
    // Use saved timezone first, then fall back to country resolution
    const campaignTimezone = userProfile?.timezone || await resolveTimezoneFromCountry(userProfile?.country);

    console.log(`[TZ] Resolved campaign timezone: ${campaignTimezone} (saved: ${userProfile?.timezone || "none"}, country: ${userProfile?.country || "not set"})`);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const { count: existingPostCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["posted", "pending", "posting", "draft"])
      .gte("scheduled_time", monthStart.toISOString());

    const currentPosts = existingPostCount || 0;
    const remaining = planLimit - currentPosts;

    if (remaining <= 0) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      return new Response(JSON.stringify({ 
        error: `Monthly limit reached! Your ${userPlan} plan allows ${planLimit} posts/month. Upgrade for more.` 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profile = ctx.profile || {};
    const writingDna = ctx.writingDna || null;
    const aiInstructions = unifiedContext?.aiInstructions || "";

    // Get agent type config
    const agentType = campaign.agent_type || campaign.tone_type || "professional";
    const agentConfig = AGENT_TYPE_PROMPTS[agentType] || AGENT_TYPE_PROMPTS.professional;

    // Calculate posting dates — always use posting days within date range
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const postDates: Date[] = [];
    const postsPerDay = campaign.posts_per_day || 1;
    const postingDays: string[] = campaign.posting_days || ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
    
    const dayNames = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

    let current = new Date(startDate);
    const maxPosts = Math.min(campaign.post_count || 100, remaining);
    while (current <= endDate && postDates.length < maxPosts) {
      if (current >= today && postingDays.includes(dayNames[current.getDay()])) {
        for (let p = 0; p < postsPerDay && postDates.length < maxPosts; p++) {
          postDates.push(new Date(current));
        }
      }
      current.setDate(current.getDate() + 1);
    }

    if (postDates.length === 0) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      return new Response(JSON.stringify({ error: "All campaign dates are in the past or no matching posting days. Please update the schedule." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Research
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
              query: `Latest trends and insights about ${campaign.topic} for LinkedIn${profile.industry ? ` in ${profile.industry}` : ""}`,
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

    const contentLengthRule = CONTENT_LENGTH_RULES[campaign.content_length || "medium"] || CONTENT_LENGTH_RULES.medium;
    const emojiRule = EMOJI_RULES[campaign.emoji_level || "moderate"] || EMOJI_RULES.moderate;

    let hashtagRule = "";
    if (campaign.hashtag_mode === "none") {
      hashtagRule = "Add ONLY #LinkedBot as the last line of the post. No other hashtags.";
    } else if (campaign.hashtag_mode === "manual" && campaign.fixed_hashtags?.length > 0) {
      const userHashtags = campaign.fixed_hashtags.map((h: string) => h.startsWith("#") ? h : `#${h}`).join(" ");
      hashtagRule = `Always include these hashtags at the end: ${userHashtags} #LinkedBot (LinkedBot must always be the last hashtag)`;
    } else {
      hashtagRule = "Add 3-5 relevant hashtags at the end of each post. ALWAYS include #LinkedBot as the very last hashtag.";
    }

    const footerRule = campaign.footer_text
      ? `\nIMPORTANT: Append this exact footer at the end of every post (after a blank line):\n"${campaign.footer_text}"\nDo NOT modify or paraphrase the footer.`
      : "";

    // Build Writing DNA context
    let writingDnaContext = "";
    if (writingDna) {
      writingDnaContext = `\nUSER'S WRITING DNA (IMPORTANT - blend this with agent style):
- Tone: ${writingDna.toneType || "auto"}
- Avg Post Length: ${writingDna.avgPostLength || 200} words
- Uses Emojis: ${writingDna.usesEmojis ? "Yes" : "No"}, Frequency: ${writingDna.emojiFrequency || "moderate"}
- Hook Style: ${writingDna.hookStyle || "question"}
- Uses Bullet Points: ${writingDna.usesBulletPoints ? "Yes" : "No"}
- Signature Phrases: ${writingDna.signaturePhrases?.join(", ") || "none"}
- Topics: ${writingDna.topicsHistory?.join(", ") || "various"}

CRITICAL: The user's Writing DNA represents their personal voice. The agent type (${agentType}) should influence the FORMAT and STRUCTURE of posts, but the VOICE and PERSONALITY should come from the Writing DNA. Think of it as: the user's voice + the agent's format.`;
    }

    // Build agent-specific training context
    let agentTrainingContext = "";
    const referenceMaterials = ctx.referenceMaterials || [];
    const agentTrainingMaterials = referenceMaterials.filter(
      (m: any) => m.type === `agent_training_${agentType}`
    );
    if (agentTrainingMaterials.length > 0) {
      agentTrainingContext = `\nAGENT-SPECIFIC TRAINING DATA (User provided these guidelines specifically for the ${agentType} agent - FOLLOW THESE CLOSELY):
${agentTrainingMaterials.map((m: any, i: number) => `${i + 1}. ${m.content}`).join("\n")}
`;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `You are the content generation engine for LinkedBot — a LinkedIn automation SaaS.

You must strictly respect the user's campaign settings when generating content.

AGENT TYPE: ${agentType.toUpperCase()}
${agentConfig.style}

EMOJI STYLE FOR THIS AGENT: ${agentConfig.emoji}

${aiInstructions}
${writingDnaContext}
${agentTrainingContext}

USER PROFILE:
- Name: ${profile.name || "Professional"}
- Role: ${profile.role || "Professional"}
- Company: ${profile.companyName || ""}
- Industry: ${profile.industry || ""}
- Location: ${profile.location || ""}
${researchInsights}

CONTENT RULES:
1. Each post MUST be unique with a different angle on the topic
2. Vary post structure across the campaign (hooks, stories, data, questions, lists)
3. Write as the user, not as an AI
4. ${contentLengthRule}
5. ${emojiRule}
6. ${hashtagRule}
7. Make each post a standalone piece that can be read independently
8. Number each post clearly as "Post 1:", "Post 2:", etc.
${footerRule}

FORMATTING RULES — CRITICAL (LinkedIn collapses single line breaks):
- Use DOUBLE line breaks (\\n\\n) between EVERY paragraph
- NEVER write large paragraphs. Keep them to 1-2 sentences max
- Each thought gets its OWN short paragraph with a blank line before and after
- The post must look AIRY and EASY TO READ with lots of white space
- Start with a strong hook (question, bold claim, surprising stat, or personal story opener)
- Use bullet points (•) when listing ideas, benefits, or examples
- End with a clear takeaway, call-to-action, or thought-provoking question
- ALWAYS end every post with #LinkedBot as the very last hashtag on its own line

HUMANIZATION RULES:
- Use contractions: "I'm" not "I am", "don't" not "do not", "can't" not "cannot"
- Be conversational like talking to a smart colleague over coffee
- BANNED WORDS/PHRASES: "Let me share", "In conclusion", "Furthermore", "Moreover", "leverage", "synergy", "optimize", "utilize", "In today's fast-paced world", "In this article", "As we all know"
- Mix short punchy sentences with slightly longer ones for rhythm
- Start with hooks, NEVER with generic intros
- Use "you" and "your" to speak directly to the reader
- Include a human touch: personal opinion, a lesson learned, or a relatable moment

Generate exactly ${postDates.length} LinkedIn posts. Separate each with "---POST_SEPARATOR---"`;

    // Multi-topic support: topics separated by |||
    const topicStr = campaign.topic || "";
    const topicsList = topicStr.includes("|||") ? topicStr.split("|||").map((t: string) => t.trim()).filter(Boolean) : [topicStr];
    const isMultiTopic = topicsList.length > 1;

    let userPrompt = "";
    if (isMultiTopic) {
      const topicAssignments = postDates.map((_, i) => `Post ${i + 1}: "${topicsList[i % topicsList.length]}"`).join("\n");
      userPrompt = `Generate ${postDates.length} LinkedIn posts using the ${agentType} agent style. Each post MUST be about its assigned topic:\n${topicAssignments}\n\nEach post should have a unique angle on its assigned topic. Separate posts with "---POST_SEPARATOR---"`;
    } else {
      userPrompt = `Generate ${postDates.length} LinkedIn posts about "${campaign.topic}" using the ${agentType} agent style. Each post should have a different angle. Separate posts with "---POST_SEPARATOR---"`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
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
        await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const fullContent = aiData.choices?.[0]?.message?.content || "";

    const rawPosts = fullContent
      .split("---POST_SEPARATOR---")
      .map((p: string) => p.trim())
      .filter((p: string) => p.length > 20);

    if (rawPosts.length === 0) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      return new Response(JSON.stringify({ error: "Failed to generate posts" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanPosts = rawPosts.map((p: string) =>
      p.replace(/^Post\s*\d+\s*:\s*/i, "").trim()
    );

    // Generate AI images with agent-type-specific style
    // Generate AI images OR use uploaded image
    let imageUrls: (string | null)[] = new Array(cleanPosts.length).fill(null);
    
    if (campaign.image_option === "upload" && campaign.uploaded_image_url) {
      console.log("📎 Using uploaded image for all posts:", campaign.uploaded_image_url);
      imageUrls = new Array(cleanPosts.length).fill(campaign.uploaded_image_url);
    } else if (campaign.image_option === "ai") {
      console.log(`🎨 Generating ${agentType}-style images one by one...`);
      const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      // Generate images sequentially, one at a time, to avoid timeouts and rate limits
      const maxImages = Math.min(cleanPosts.length, 8);
      for (let i = 0; i < maxImages; i++) {
        try {
          console.log(`🖼️ Generating image ${i + 1}/${maxImages}...`);
          const prompt = generateImagePrompt(cleanPosts[i], profile, agentConfig.imageStyle);
          const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
          });
          
          if (imgResponse.ok) {
            const imgData = await imgResponse.json();
            const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (base64Url) {
              const fileName = `campaign-${campaignId}-post-${i}-${Date.now()}.png`;
              const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              
              const { error: uploadError } = await serviceClient.storage
                .from("post-images")
                .upload(fileName, binaryData, { contentType: "image/png", upsert: true });
              
              if (!uploadError) {
                const { data: publicUrl } = serviceClient.storage.from("post-images").getPublicUrl(fileName);
                imageUrls[i] = publicUrl.publicUrl;
                console.log(`✅ Image ${i + 1} done`);
              }
            }
          } else {
            console.warn(`⚠️ Image ${i + 1} failed with status ${imgResponse.status}`);
          }
          
          // Small delay between sequential requests to be gentle on the API
          if (i < maxImages - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (imgErr) {
          console.error(`Image ${i + 1} failed:`, imgErr);
        }
      }
      console.log(`✅ Generated ${imageUrls.filter(u => u).length}/${cleanPosts.length} images (sequential, capped at ${maxImages})`);
    }

    // Create posts — track which post index per day for 2-posts/day support
    const dayPostIndex: Record<string, number> = {};
    const postsToInsert = cleanPosts.slice(0, postDates.length).map((content: string, i: number) => {
      const postDate = postDates[i];
      const dateKey = postDate.toISOString().slice(0, 10);

      // Track which post number this is on the same day (0-based)
      const postIndexOnDay = dayPostIndex[dateKey] || 0;
      dayPostIndex[dateKey] = postIndexOnDay + 1;
      
      let hour: number, minute: number;
      if (campaign.auto_best_time) {
        // For 2nd post of the day, offset by +4 hours to avoid same time
        const base = pickBestTime(i, agentType);
        if (postIndexOnDay === 0) {
          ({ hour, minute } = base);
        } else {
          // Second post: pick a different time (afternoon/evening)
          const secondHours = [14, 15, 17, 18, 19];
          hour = secondHours[i % secondHours.length];
          // Ensure it's different from the first post's hour
          if (hour === base.hour) hour = (hour + 2) % 24 || 14;
          minute = base.minute === 0 ? 30 : 0;
        }
      } else {
        if (postIndexOnDay === 0) {
          ({ hour, minute } = parsePostingTime(campaign.posting_time || "09:00"));
        } else {
          // Use second_posting_time for the 2nd post, fallback to +4 hours from first
          const firstTime = parsePostingTime(campaign.posting_time || "09:00");
          if (campaign.second_posting_time) {
            ({ hour, minute } = parsePostingTime(campaign.second_posting_time));
          } else {
            hour = (firstTime.hour + 4) % 24 || 17;
            minute = firstTime.minute;
          }
        }
      }

      const finalScheduledTime = convertCountryLocalToUTC(dateKey, hour, minute, campaignTimezone);

      console.log(
        `[TZ] Post ${i + 1}: ${hour}:${String(minute).padStart(2, "0")} ${campaignTimezone} on ${dateKey} → ${finalScheduledTime.toISOString()} UTC`
      );

      return {
        user_id: user.id,
        campaign_id: campaignId,
        content,
        photo_url: imageUrls[i] || null,
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

    await supabase.from("campaigns").update({
      status: campaign.auto_approve ? "active" : "draft",
      post_count: createdPosts?.length || postsToInsert.length,
    }).eq("id", campaignId);

    // Send email previews for the first 3 posts (non-blocking)
    if (createdPosts && createdPosts.length > 0) {
      const previewPosts = createdPosts.slice(0, 3);
      for (const p of previewPosts) {
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-post-preview`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ postId: p.id }),
          });
        } catch (emailErr) {
          console.warn("Preview email failed (non-critical):", emailErr);
        }
      }
      console.log(`📧 Sent preview emails for ${previewPosts.length} posts`);
    }

    return new Response(JSON.stringify({
      success: true,
      postsGenerated: createdPosts?.length || postsToInsert.length,
      imagesGenerated: imageUrls.filter(u => u).length,
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

function generateImagePrompt(content: string, profile: any, agentImageStyle: string): string {
  const firstLine = content.split('\n').filter((l: string) => l.trim())[0]?.trim() || 'Professional content';
  const clean = firstLine.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').replace(/[^\w\s.,!?-]/g, '').trim().substring(0, 120);
  
  const themes: string[] = [];
  const lower = content.toLowerCase();
  if (lower.includes('ai') || lower.includes('artificial intelligence')) themes.push('AI technology');
  if (lower.includes('leader')) themes.push('leadership');
  if (lower.includes('tech') || lower.includes('software')) themes.push('technology');
  if (lower.includes('data') || lower.includes('analytics')) themes.push('data visualization');
  if (lower.includes('team') || lower.includes('collaboration')) themes.push('teamwork');
  if (profile?.industry) themes.push(profile.industry);
  
  const themeStr = themes.length > 0 ? themes.join(', ') : 'professional business';
  return `LinkedIn post image in ${agentImageStyle} style: ${clean}, ${themeStr}, modern design, high quality, no text overlay`;
}
