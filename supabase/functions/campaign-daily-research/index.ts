import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    const TAVILY_API_KEY = Deno.env.get("TAVILY_API_KEY");

    if (!GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    const today = new Date().toISOString().split("T")[0];

    const { data: campaigns, error: campErr } = await supabase
      .from("campaigns")
      .select("*")
      .eq("status", "active")
      .eq("research_mode", true)
      .lte("start_date", today)
      .gte("end_date", today);

    if (campErr) throw campErr;
    if (!campaigns || campaigns.length === 0) {
      return new Response(JSON.stringify({ message: "No active research campaigns today" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const campaign of campaigns) {
      try {
        const { data: existingPosts } = await supabase
          .from("posts")
          .select("id")
          .eq("campaign_id", campaign.id)
          .gte("scheduled_time", `${today}T00:00:00Z`)
          .lte("scheduled_time", `${today}T23:59:59Z`);

        if (existingPosts && existingPosts.length > 0) {
          results.push({ campaignId: campaign.id, status: "skipped", reason: "Post already exists for today" });
          continue;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("name, role, company_name, industry")
          .eq("user_id", campaign.user_id)
          .single();

        const { data: writingDna } = await supabase
          .from("user_writing_profiles")
          .select("*")
          .eq("user_id", campaign.user_id)
          .single();

        // Research with cache
        let researchInsights = "";
        if (TAVILY_API_KEY) {
          const query = `Latest news and insights about ${campaign.topic} today ${today}`;
          const queryHash = simpleHash(query.toLowerCase().trim());

          // Check cache first
          const { data: cached } = await supabase
            .from("research_cache")
            .select("insights")
            .eq("query_hash", queryHash)
            .gt("expires_at", new Date().toISOString())
            .limit(1)
            .maybeSingle();

          if (cached) {
            console.log(`✅ Research cache HIT for campaign ${campaign.id}`);
            researchInsights = cached.insights;
          } else {
            try {
              const res = await fetch("https://api.tavily.com/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  api_key: TAVILY_API_KEY,
                  query,
                  search_depth: "basic",
                  max_results: 3,
                }),
              });
              const data = await res.json();
              if (data.results?.length > 0) {
                researchInsights = data.results
                  .map((r: any) => `Source: ${r.title}\nInsight: ${r.content?.substring(0, 300)}`)
                  .join("\n\n");

                // Cache the result
                await supabase.from("research_cache").insert({
                  query_hash: queryHash,
                  query_text: query.substring(0, 500),
                  insights: researchInsights,
                  source_count: data.results.length,
                }).catch(() => {});
              }
            } catch (e) {
              console.error(`Research failed for campaign ${campaign.id}:`, e);
            }
          }
        }

        // Step 2: Generate post
        const toneType = writingDna?.tone_type || campaign.tone_type || "auto";

        const systemPrompt = `You are writing a LinkedIn post for ${profile?.name || "a professional"} (${profile?.role || "Professional"} at ${profile?.company_name || "their company"} in ${profile?.industry || "their industry"}).

Topic: ${campaign.topic}
Tone: ${toneType}
${writingDna ? `Writing DNA: avg length ${writingDna.avg_post_length} words, emojis: ${writingDna.uses_emojis}, hook style: ${writingDna.hook_style}` : ""}

${researchInsights ? `TODAY'S RESEARCH INSIGHTS:\n${researchInsights}` : "Use your knowledge about the topic."}

Write ONE LinkedIn post (100-250 words) based on today's fresh insights. Write as the user. No hashtags. Make it engaging and shareable.
${!researchInsights ? "\nNote: Based on general knowledge (research unavailable today)." : ""}`;

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
              { role: "user", content: `Write today's LinkedIn post about "${campaign.topic}" using the latest insights.` },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`AI error for campaign ${campaign.id}:`, aiResponse.status, errText);
          results.push({ campaignId: campaign.id, status: "failed", reason: `AI error: ${aiResponse.status}` });
          continue;
        }

        const aiData = await aiResponse.json();
        const postContent = aiData.choices?.[0]?.message?.content?.trim();

        if (!postContent || postContent.length < 20) {
          results.push({ campaignId: campaign.id, status: "failed", reason: "Generated content too short" });
          continue;
        }

        // Step 3: Schedule post at best time
        const bestHours = [9, 10, 12, 14, 17];
        const hour = bestHours[Math.floor(Math.random() * bestHours.length)];
        const scheduledTime = new Date(`${today}T${String(hour - 5).padStart(2, "0")}:${Math.random() > 0.5 ? "30" : "00"}:00Z`);

        // If scheduled time is in the past, schedule for next available hour
        if (scheduledTime < new Date()) {
          scheduledTime.setHours(scheduledTime.getHours() + 2);
        }

        // Step 4: Insert post
        const { error: insertErr } = await supabase.from("posts").insert({
          user_id: campaign.user_id,
          campaign_id: campaign.id,
          content: postContent,
          scheduled_time: scheduledTime.toISOString(),
          status: campaign.auto_approve ? "pending" : "draft",
          retry_count: 0,
        });

        if (insertErr) {
          results.push({ campaignId: campaign.id, status: "failed", reason: insertErr.message });
          continue;
        }

        // Step 5: Create notification
        await supabase.from("notifications").insert({
          user_id: campaign.user_id,
          title: "📝 Today's post is ready!",
          message: `Your daily post about "${campaign.topic}" is ready for review.`,
          type: "campaign",
        });

        results.push({ campaignId: campaign.id, status: "success", researchUsed: !!researchInsights });

      } catch (campaignError) {
        console.error(`Error processing campaign ${campaign.id}:`, campaignError);
        results.push({ campaignId: campaign.id, status: "failed", reason: String(campaignError) });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Daily research cron error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
