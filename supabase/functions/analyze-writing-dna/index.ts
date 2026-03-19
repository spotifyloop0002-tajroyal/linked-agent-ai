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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    console.log(`[WRITING-DNA] Analyzing ${samplePosts.length} posts for user ${user.id}`);

    // Use Lovable AI gateway with JSON mode for structured output
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert writing style analyzer. Analyze the provided LinkedIn posts and extract the writer's unique style DNA.

Return a JSON object with EXACTLY these fields:
{
  "tone_type": "storyteller" | "analyst" | "creator" | "motivator" | "educator",
  "avg_post_length": <integer, average word count>,
  "uses_emojis": <boolean>,
  "emoji_frequency": "none" | "low" | "moderate" | "heavy",
  "hook_style": "question" | "bold_statement" | "story_opener" | "data_lead",
  "avg_sentence_length": "short" | "medium" | "long",
  "uses_bullet_points": <boolean>,
  "uses_numbered_lists": <boolean>,
  "signature_phrases": [<up to 5 recurring phrases>],
  "topics_history": [<up to 5 main topics>]
}

Return ONLY the JSON object, no markdown or extra text.`,
          },
          {
            role: "user",
            content: `Analyze these ${samplePosts.length} LinkedIn posts and extract the writing style DNA:\n\n${samplePosts.map((p: string, i: number) => `Post ${i + 1}:\n${p}`).join("\n\n---\n\n")}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[WRITING-DNA] AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    let dna: any;
    try {
      dna = JSON.parse(content);
    } catch (parseErr) {
      // Try extracting JSON from markdown code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        dna = JSON.parse(jsonMatch[1].trim());
      } else {
        console.error("[WRITING-DNA] Failed to parse AI response:", content);
        throw new Error("AI did not return valid JSON");
      }
    }

    console.log("[WRITING-DNA] Analysis result:", JSON.stringify(dna));

    // Upsert Writing DNA profile
    const { error: upsertErr } = await supabase
      .from("user_writing_profiles")
      .upsert({
        user_id: user.id,
        tone_type: dna.tone_type || "auto",
        avg_post_length: dna.avg_post_length || 200,
        uses_emojis: dna.uses_emojis ?? true,
        emoji_frequency: dna.emoji_frequency || "moderate",
        hook_style: dna.hook_style || "question",
        avg_sentence_length: dna.avg_sentence_length || "medium",
        uses_bullet_points: dna.uses_bullet_points ?? false,
        uses_numbered_lists: dna.uses_numbered_lists ?? false,
        signature_phrases: dna.signature_phrases || [],
        topics_history: dna.topics_history || [],
        sample_posts: samplePosts.map((p: string) => ({ content: p.substring(0, 500) })),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    if (upsertErr) {
      console.error("[WRITING-DNA] Upsert error:", upsertErr);
      throw upsertErr;
    }

    console.log("[WRITING-DNA] ✅ DNA saved successfully for user", user.id);

    return new Response(JSON.stringify({ success: true, dna }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[WRITING-DNA] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
