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

    // Accept base64-encoded file data + file type
    const { fileData, fileType, fileName } = await req.json();

    if (!fileData || !fileType) {
      return new Response(JSON.stringify({ error: "fileData and fileType are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");
    if (!GOOGLE_GEMINI_API_KEY) throw new Error("GOOGLE_GEMINI_API_KEY not configured");

    let prompt: string;
    const messages: any[] = [];

    if (fileType.startsWith("image/")) {
      // For images, use vision capability
      messages.push({
        role: "system",
        content: "You are a document extraction expert. Extract ALL text and meaningful content from this image. If it's a screenshot of LinkedIn posts, extract each post's content. If it's a company document, extract key information like company name, products, services, values, target audience, and any relevant details.",
      });
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract all text and meaningful content from this ${fileName || "image"}. Return it as structured text organized by sections.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${fileType};base64,${fileData}` },
          },
        ],
      });
    } else {
      // For PDFs/text, decode and send as text
      const textContent = atob(fileData);
      messages.push({
        role: "system",
        content: "You are a document extraction expert. Extract and organize the key information from this document. Focus on: company details, products/services, brand voice, target audience, key messages, and any content that would help create LinkedIn posts.",
      });
      messages.push({
        role: "user",
        content: `Extract and organize the key information from this document (${fileName || "document"}):\n\n${textContent.substring(0, 50000)}`,
      });
    }

    const aiResponse = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GOOGLE_GEMINI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.0-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "extracted_content",
              description: "Return the extracted document content",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Document title or summary" },
                  content: { type: "string", description: "Full extracted text content, organized by sections" },
                  type: {
                    type: "string",
                    enum: ["company_info", "brand_guidelines", "writing_sample", "product_info", "general"],
                    description: "Type of content detected",
                  },
                  key_topics: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key topics found (max 10)",
                  },
                  post_suggestions: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 LinkedIn post ideas based on this content",
                  },
                },
                required: ["title", "content", "type"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extracted_content" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return extracted content");
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Save as reference material
    const { error: insertErr } = await supabase.from("agent_reference_materials").insert({
      user_id: user.id,
      title: extracted.title || fileName || "Uploaded Document",
      content: extracted.content,
      type: extracted.type === "writing_sample" ? "writing_sample" : 
            extracted.type === "brand_guidelines" ? "brand_guidelines" : "topic_notes",
    });

    if (insertErr) console.error("Failed to save reference material:", insertErr);

    return new Response(JSON.stringify({
      success: true,
      extracted,
      saved: !insertErr,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Document extraction error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to extract document",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
