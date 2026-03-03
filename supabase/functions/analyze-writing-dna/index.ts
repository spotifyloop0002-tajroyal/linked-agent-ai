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

    const { samplePosts } = await req.json();

    if (!samplePosts || !Array.isArray(samplePosts) || samplePosts.length < 3) {
      return new Response(JSON.stringify({ error: "Please provide at least 3 sample posts" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    // Analyze with AI using tool calling for structured output
    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages: [
          {
            role: "system",
            content: "You are an expert writing style analyzer. Analyze the provided LinkedIn posts and extract the writer's unique style DNA.",
          },
          {
            role: "user",
            content: `Analyze these ${samplePosts.length} LinkedIn posts and extract the writing style:\n\n${samplePosts.map((p: string, i: number) => `Post ${i + 1}:\n${p}`).join("\n\n---\n\n")}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_writing_dna",
              description: "Save the analyzed writing DNA profile",
              parameters: {
                type: "object",
                properties: {
                  tone_type: {
                    type: "string",
                    enum: ["storyteller", "analyst", "creator", "motivator", "educator"],
                    description: "Primary writing tone",
                  },
                  avg_post_length: { type: "integer", description: "Average post length in words" },
                  uses_emojis: { type: "boolean" },
                  emoji_frequency: { type: "string", enum: ["none", "low", "moderate", "heavy"] },
                  hook_style: {
                    type: "string",
                    enum: ["question", "bold_statement", "story_opener", "data_lead"],
                  },
                  avg_sentence_length: { type: "string", enum: ["short", "medium", "long"] },
                  uses_bullet_points: { type: "boolean" },
                  uses_numbered_lists: { type: "boolean" },
                  signature_phrases: {
                    type: "array",
                    items: { type: "string" },
                    description: "Recurring phrases or patterns (max 5)",
                  },
                  topics_history: {
                    type: "array",
                    items: { type: "string" },
                    description: "Main topics identified (max 5)",
                  },
                },
                required: ["tone_type", "avg_post_length", "uses_emojis", "emoji_frequency", "hook_style", "avg_sentence_length", "uses_bullet_points", "uses_numbered_lists"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_writing_dna" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured DNA data");
    }

    const dna = JSON.parse(toolCall.function.arguments);

    // Upsert Writing DNA profile
    const { error: upsertErr } = await supabase
      .from("user_writing_profiles")
      .upsert({
        user_id: user.id,
        tone_type: dna.tone_type,
        avg_post_length: dna.avg_post_length,
        uses_emojis: dna.uses_emojis,
        emoji_frequency: dna.emoji_frequency,
        hook_style: dna.hook_style,
        avg_sentence_length: dna.avg_sentence_length,
        uses_bullet_points: dna.uses_bullet_points,
        uses_numbered_lists: dna.uses_numbered_lists,
        signature_phrases: dna.signature_phrases || [],
        topics_history: dna.topics_history || [],
        sample_posts: samplePosts.map((p: string) => ({ content: p.substring(0, 500) })),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertErr) throw upsertErr;

    return new Response(JSON.stringify({ success: true, dna }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Writing DNA analysis error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
