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

// ============================================
// FETCH UNIFIED CONTEXT via get-agent-context
// ============================================
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

    // Fetch campaign AND unified context in parallel
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

    // Check LinkedIn connection before generating campaign posts
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

    // Update campaign status to generating
    await supabase.from("campaigns").update({ status: "generating" }).eq("id", campaignId);

    // Extract data from unified context
    const profile = ctx.profile || {};
    const writingDna = ctx.writingDna || null;
    const aiInstructions = unifiedContext?.aiInstructions || "";

    // Calculate posting dates — skip past dates
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const postDates: Date[] = [];
    const postsPerDay = campaign.posts_per_day || 1;

    if (campaign.duration_type === "alternate") {
      let current = new Date(startDate);
      while (current <= endDate && postDates.length < campaign.post_count) {
        if (current >= today) {
          for (let p = 0; p < postsPerDay && postDates.length < campaign.post_count; p++) {
            postDates.push(new Date(current));
          }
        }
        current.setDate(current.getDate() + 2);
      }
    } else {
      let current = new Date(startDate);
      while (current <= endDate && postDates.length < campaign.post_count) {
        if (current >= today) {
          for (let p = 0; p < postsPerDay && postDates.length < campaign.post_count; p++) {
            postDates.push(new Date(current));
          }
        }
        current.setDate(current.getDate() + 1);
      }
    }

    if (postDates.length === 0) {
      await supabase.from("campaigns").update({ status: "failed" }).eq("id", campaignId);
      return new Response(JSON.stringify({ error: "All campaign dates are in the past. Please update the start date." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      ? `\nIMPORTANT: Append this exact footer at the end of every post (after a blank line):\n"${campaign.footer_text}"\nDo NOT modify or paraphrase the footer.`
      : "";

    // Generate all posts with Lovable AI
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    const systemPrompt = `You are a LinkedIn content expert generating a campaign of ${postDates.length} posts about "${campaign.topic}".

${aiInstructions}

USER PROFILE:
- Name: ${profile.name || "Professional"}
- Role: ${profile.role || "Professional"}
- Company: ${profile.companyName || ""}
- Industry: ${profile.industry || ""}
- Location: ${profile.location || ""}
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

HUMANIZATION RULES:
- Use contractions: "I'm" not "I am", "don't" not "do not"
- Be conversational like talking to a smart colleague
- BANNED: "Let me share", "In conclusion", "Furthermore", "Moreover", "leverage", "synergy", "optimize", "utilize"
- Mix short and long sentences
- Start with hooks, not generic intros

Generate exactly ${postDates.length} LinkedIn posts. Separate each with "---POST_SEPARATOR---"`;

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
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

    // Parse posts
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

    // Clean post content
    const cleanPosts = rawPosts.map((p: string) =>
      p.replace(/^Post\s*\d+\s*:\s*/i, "").trim()
    );

    // Generate AI images if campaign has image_option = 'ai'
    let imageUrls: (string | null)[] = new Array(cleanPosts.length).fill(null);
    if (campaign.image_option === "ai") {
      console.log("🎨 Generating AI images for campaign posts...");
      // Generate images in batches of 3 to avoid rate limits
      for (let i = 0; i < cleanPosts.length; i += 3) {
        const batch = cleanPosts.slice(i, i + 3);
        const imagePromises = batch.map(async (content: string, batchIdx: number) => {
          try {
            const prompt = generateImagePrompt(content, profile);
            const imgResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${GOOGLE_GEMINI_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "gemini-2.0-flash",
                messages: [{ role: "user", content: prompt }],
                modalities: ["image", "text"],
              }),
            });
            
            if (imgResponse.ok) {
              const imgData = await imgResponse.json();
              const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
              if (base64Url) {
                // Upload to storage
                const fileName = `campaign-${campaignId}-post-${i + batchIdx}-${Date.now()}.png`;
                const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
                const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                
                const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
                const { error: uploadError } = await serviceClient.storage
                  .from("post-images")
                  .upload(fileName, binaryData, { contentType: "image/png", upsert: true });
                
                if (!uploadError) {
                  const { data: publicUrl } = serviceClient.storage.from("post-images").getPublicUrl(fileName);
                  return publicUrl.publicUrl;
                }
              }
            }
          } catch (imgErr) {
            console.error(`Image generation failed for post ${i + batchIdx}:`, imgErr);
          }
          return null;
        });
        
        const results = await Promise.all(imagePromises);
        results.forEach((url, batchIdx) => {
          imageUrls[i + batchIdx] = url;
        });
        
        // Small delay between batches to avoid rate limits
        if (i + 3 < cleanPosts.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      console.log(`✅ Generated ${imageUrls.filter(u => u).length}/${cleanPosts.length} images`);
    }

    // Create posts in database
    const postsToInsert = cleanPosts.slice(0, postDates.length).map((content: string, i: number) => {
      const postDate = postDates[i];
      
      let hour: number, minute: number;
      if (campaign.auto_best_time) {
        ({ hour, minute } = pickBestTime(i));
      } else {
        ({ hour, minute } = parsePostingTime(campaign.posting_time || "09:00"));
      }

      const scheduledTime = new Date(postDate);
      scheduledTime.setUTCHours(0, 0, 0, 0);
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const timeOfDayMs = (hour * 60 + minute) * 60 * 1000;
      const finalMs = scheduledTime.getTime() + timeOfDayMs - istOffsetMs;
      const finalScheduledTime = new Date(finalMs);

      console.log(`[TZ] Post ${i}: ${hour}:${String(minute).padStart(2, '0')} IST → ${finalScheduledTime.toISOString()} UTC`);

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

    // Update campaign status
    await supabase.from("campaigns").update({
      status: campaign.auto_approve ? "active" : "draft",
      post_count: createdPosts?.length || postsToInsert.length,
    }).eq("id", campaignId);

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

function generateImagePrompt(content: string, profile: any): string {
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
  return `Professional LinkedIn post image: ${clean}, ${themeStr}, modern clean design, high quality, no text overlay`;
}
