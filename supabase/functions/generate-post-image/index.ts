import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate intelligent image prompt from actual post content
function generateImagePromptFromPost(postContent: string): string {
  const lines = postContent.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0]?.trim() || 'Professional business content';
  
  const cleanTopic = firstLine
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\w\s.,!?-]/g, '')
    .trim()
    .substring(0, 150);
  
  const themes: string[] = [];
  const lowerContent = postContent.toLowerCase();
  
  if (lowerContent.includes('ai') || lowerContent.includes('artificial intelligence')) themes.push('artificial intelligence, technology');
  if (lowerContent.includes('linkedin') || lowerContent.includes('social media')) themes.push('social media, networking, professional platform');
  if (lowerContent.includes('car') || lowerContent.includes('automotive')) themes.push('automotive industry, modern vehicles');
  if (lowerContent.includes('tech') || lowerContent.includes('software')) themes.push('technology, digital innovation');
  if (lowerContent.includes('leader') || lowerContent.includes('leadership')) themes.push('leadership, business excellence');
  if (lowerContent.includes('data') || lowerContent.includes('analytics')) themes.push('data visualization, analytics');
  if (lowerContent.includes('team') || lowerContent.includes('collaboration')) themes.push('teamwork, collaboration');
  if (lowerContent.includes('automation') || lowerContent.includes('automate')) themes.push('automation, efficiency, robots');
  
  const themeString = themes.length > 0 ? themes.join(', ') : 'professional business, corporate';
  
  return `Generate a professional, visually striking image for a LinkedIn post. Topic: ${cleanTopic}. Themes: ${themeString}. Style: Modern, clean, professional design with vibrant colors. Format: Square 1:1 aspect ratio. No text overlay on the image.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, postContent } = await req.json() as {
      prompt?: string;
      postContent: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
    
    const imagePrompt = generateImagePromptFromPost(postContent || prompt || '');
    console.log("📝 Image prompt:", imagePrompt.substring(0, 200));

    let imageUrl: string | null = null;

    // Try Lovable AI Gateway first (recommended approach)
    if (LOVABLE_API_KEY) {
      console.log("🎨 Generating image with Lovable AI (Gemini Flash Image)...");
      
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: imagePrompt
              }
            ],
            modalities: ["image", "text"]
          }),
        });

        if (!response.ok) {
          const status = response.status;
          const errorText = await response.text();
          console.error("❌ Lovable AI error:", status, errorText);
          
          if (status === 429) {
            console.log("⚠️ Rate limited, will try fallback...");
          } else if (status === 402) {
            console.log("⚠️ Credits low, will try fallback...");
          }
        } else {
          const data = await response.json();
          const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          
          if (base64Url) {
            console.log("✅ Lovable AI image generated, uploading to storage...");
            
            // Upload base64 image to Supabase Storage
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              
              // Extract base64 data
              const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const fileName = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from("post-images")
                .upload(fileName, bytes, {
                  contentType: "image/png",
                  upsert: false,
                });
              
              if (!uploadError && uploadData) {
                const { data: publicUrl } = supabase.storage
                  .from("post-images")
                  .getPublicUrl(fileName);
                
                imageUrl = publicUrl.publicUrl;
                console.log("✅ Image uploaded to storage:", imageUrl);
              } else {
                console.warn("⚠️ Storage upload failed:", uploadError);
                // Use base64 URL directly as fallback
                imageUrl = base64Url;
              }
            } else {
              imageUrl = base64Url;
            }
          }
        }
      } catch (err) {
        console.error("❌ Lovable AI request failed:", err);
      }
    }

    // Fallback to Hugging Face
    if (!imageUrl && HUGGINGFACE_API_KEY) {
      console.log("🔄 Falling back to Hugging Face...");
      
      try {
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: imagePrompt,
              parameters: { width: 1024, height: 1024, num_inference_steps: 30, guidance_scale: 7.5 },
            }),
          }
        );

        if (hfResponse.ok) {
          const contentType = hfResponse.headers.get("content-type");
          if (contentType?.includes("image")) {
            const arrayBuffer = await hfResponse.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const fileName = `hf-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from("post-images")
                .upload(fileName, uint8Array, { contentType: "image/png", upsert: false });
              
              if (!uploadError && uploadData) {
                const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(fileName);
                imageUrl = publicUrl.publicUrl;
                console.log("✅ HF image uploaded:", imageUrl);
              }
            }
          }
        }
      } catch (hfError) {
        console.error("❌ Hugging Face failed:", hfError);
      }
    }

    if (!imageUrl) {
      console.error("❌ No image generated from any provider");
      throw new Error("Failed to generate image from any provider");
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: imageUrl,
      message: "Image generated successfully!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate image error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to generate image" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
