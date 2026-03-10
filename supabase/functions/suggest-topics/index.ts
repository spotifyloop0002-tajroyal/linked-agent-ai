import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a LinkedIn content strategist. When given an agent type, suggest 6 specific, trending, and timely campaign topics for LinkedIn posts. Focus on what's currently hot and relevant in March 2026. Each topic should be concise (3-8 words) and actionable for a LinkedIn content campaign.`,
          },
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

    // Parse the JSON array from the response
    let topics: string[] = [];
    try {
      // Extract JSON array from possibly markdown-wrapped response
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
