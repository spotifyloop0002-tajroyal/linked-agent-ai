import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentType } = await req.json();
    if (!agentType) {
      return new Response(
        JSON.stringify({ error: "agentType is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for personalized suggestions
    let profileContext = "";
    try {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("name, industry, company_name, company_description, background, target_audience, default_topics, role, posting_goals")
            .eq("user_id", user.id)
            .single();

          if (profile) {
            const parts: string[] = [];
            if (profile.name) parts.push(`Name: ${profile.name}`);
            if (profile.industry) parts.push(`Industry: ${profile.industry}`);
            if (profile.company_name) parts.push(`Company: ${profile.company_name}`);
            if (profile.company_description) parts.push(`Company Description: ${profile.company_description}`);
            if (profile.background) parts.push(`Professional Background: ${profile.background}`);
            if (profile.target_audience) parts.push(`Target Audience: ${profile.target_audience}`);
            if (profile.role) parts.push(`Role: ${profile.role}`);
            if (profile.default_topics?.length) parts.push(`Preferred Topics: ${profile.default_topics.join(", ")}`);
            if (profile.posting_goals?.length) parts.push(`Posting Goals: ${profile.posting_goals.join(", ")}`);
            if (parts.length > 0) {
              profileContext = `\n\nUser Profile:\n${parts.join("\n")}`;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch user profile for suggestions:", e);
    }

    const agentDescriptions: Record<string, string> = {
      comedy: "Comedy/Humorous — funny, relatable LinkedIn posts with wit and punchlines",
      professional: "Professional — formal industry insights and expert analysis",
      storytelling: "Storytelling — personal founder journey stories that inspire",
      "thought-leadership": "Thought Leadership — bold opinions and contrarian industry takes",
      motivational: "Motivational — inspirational posts that energize and uplift",
      "data-analytics": "Data/Analytics — stats, charts, and data-driven insights",
      creative: "Creative/Design — visual concepts and creative thinking",
      news: "News/Updates — latest industry news and trend analysis",
    };

    const agentDesc = agentDescriptions[agentType] || agentType;

    const systemPrompt = `You are a LinkedIn content strategist. Suggest 6 specific, trending, and timely campaign topics for LinkedIn posts. Focus on what's currently hot and relevant in March 2026. Each topic should be concise (3-8 words) and actionable for a LinkedIn content campaign.${profileContext ? `\n\nIMPORTANT: Personalize topics based on the user's profile below. Make topics relevant to their industry, role, company, and target audience. The topics should feel tailored specifically for this person, not generic.${profileContext}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Suggest 6 trending LinkedIn campaign topics for this agent style: ${agentDesc}. Return ONLY a JSON array of strings, nothing else. Example: ["Topic 1","Topic 2","Topic 3","Topic 4","Topic 5","Topic 6"]`,
          },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Failed to get suggestions" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    let topics: string[] = [];
    try {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        topics = JSON.parse(match[0]);
      }
    } catch {
      console.error("Failed to parse topics:", content);
      topics = [];
    }

    return new Response(
      JSON.stringify({ success: true, topics }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("suggest-topics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
