import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Extract the core idea and visual metaphor from post content
function extractCoreIdea(postContent: string): { hook: string; metaphor: string; theme: string } {
  const lines = postContent.split('\n').filter(l => l.trim().length > 0);
  const hook = (lines[0] || 'Professional insight')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/[^\w\s.,!?'-]/g, '')
    .trim()
    .substring(0, 80);

  const lower = postContent.toLowerCase();

  // Detect visual metaphor based on content themes
  const metaphors: [RegExp, string][] = [
    [/grow|scale|progress|journey|evolv/i, 'upward stairs, growth path, ascending line'],
    [/fail|struggle|hard|difficult|pain/i, 'contrast of messy vs clean, obstacle overcome'],
    [/consist|daily|habit|routine|repeat/i, 'calendar rhythm, consistent pattern, daily streak'],
    [/success|win|achiev|goal|milestone/i, 'light breaking through, clarity moment, peak'],
    [/team|collaborat|together|culture/i, 'connected elements, unified structure'],
    [/ai|automat|tech|innovat|digital/i, 'clean geometric shapes, modern circuit pattern'],
    [/leader|vision|inspire|mentor/i, 'guiding light, path forward, compass'],
    [/data|analytic|insight|metric/i, 'minimal chart, clean data visualization'],
    [/learn|lesson|mistake|pivot/i, 'turning point, direction change, crossroads'],
    [/start|begin|launch|build|creat/i, 'foundation being laid, first brick, blank canvas'],
  ];

  let metaphor = 'clean abstract geometric composition representing professional insight';
  for (const [pattern, visual] of metaphors) {
    if (pattern.test(lower)) {
      metaphor = visual;
      break;
    }
  }

  // Detect broad theme
  let theme = 'professional, modern';
  if (/ai|tech|software|code/i.test(lower)) theme = 'technology, digital';
  else if (/lead|manage|ceo|founder/i.test(lower)) theme = 'leadership, business';
  else if (/market|brand|content|social/i.test(lower)) theme = 'marketing, creative';
  else if (/health|wellness|mental|burnout/i.test(lower)) theme = 'wellness, balance';
  else if (/money|revenue|profit|invest/i.test(lower)) theme = 'finance, business';

  return { hook, metaphor, theme };
}

// Build the prompt for concept-driven LinkedIn visuals
function buildImagePrompt(postContent: string, mode: string): string {
  const { hook, metaphor, theme } = extractCoreIdea(postContent);

  if (mode === 'text-card') {
    // Text-based image (bold typography card)
    return `Create a clean, scroll-stopping LinkedIn post image.

DESIGN:
- Minimal background: solid white, solid black, or very subtle gradient
- Large bold sans-serif typography as the main element
- Center-aligned or slightly left-aligned text
- High contrast, easy to read on mobile
- Square 1:1 aspect ratio
- Professional and aesthetic

TEXT TO DISPLAY (write exactly this on the image):
"${hook}"

RULES:
- Max 10-12 words of text total
- 2-4 words per line, break lines for readability
- NO illustrations, NO icons, NO stock graphics
- NO cluttered visuals
- Text IS the visual — make it bold and punchy
- Add very subtle geometric accent shapes if needed (thin lines, dots)
- Clean spacing around all edges`;
  }

  // Concept-driven visual (default)
  return `Create a meaningful, concept-driven image for a LinkedIn post.

CORE IDEA: "${hook}"
VISUAL METAPHOR: ${metaphor}
THEME: ${theme}

DESIGN RULES:
- Modern minimal illustration or clean scene representing the concept
- Soft gradients or clean solid backgrounds
- Professional and aesthetic — suitable for LinkedIn feed
- Square 1:1 aspect ratio
- Clear visual concept (not random scattered elements)
- High quality, scroll-stopping

STRICTLY AVOID:
- Random icons scattered around
- Generic AI brain graphics
- Cluttered stock-style templates
- Corporate clip art
- Text overlays (keep image text-free or 1 very short line max)

STYLE: Clean, modern, conceptual — like a high-end design studio portfolio piece.
The image should clearly represent the idea of: ${metaphor}`;
}

// Upload base64 image to Supabase Storage
async function uploadToStorage(base64Url: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseKey) return base64Url;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const fileName = `ai-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
  const { data, error } = await supabase.storage
    .from("post-images")
    .upload(fileName, bytes, { contentType: "image/png", upsert: false });

  if (error || !data) {
    console.warn("⚠️ Storage upload failed:", error);
    return base64Url;
  }

  const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(fileName);
  return publicUrl.publicUrl;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, postContent, mode = 'concept', originalImageUrl } = await req.json() as {
      prompt?: string;
      postContent: string;
      mode?: 'concept' | 'text-card' | 'redesign';
      originalImageUrl?: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
    const content = postContent || prompt || '';

    let imageUrl: string | null = null;

    // ─── REDESIGN MODE: Edit uploaded image with AI ───
    if (mode === 'redesign' && originalImageUrl && LOVABLE_API_KEY) {
      console.log("🎨 Redesigning uploaded image with AI...");
      const redesignPrompt = `Redesign this image for a professional LinkedIn post.

GOAL: Transform into a clean, modern, high-performing LinkedIn visual.

RULES:
- Keep text short (max 10-15 words), focus on main message
- Minimal layout with large bold readable text
- High contrast, mobile-friendly
- Clean spacing and strong visual hierarchy
- Remove clutter and unnecessary elements
- Do NOT keep original messy layout
- Make it look like a high-quality design studio piece

STYLE: Clean, modern, professional — suitable for LinkedIn feed. 1:1 aspect ratio.`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{
              role: "user",
              content: [
                { type: "text", text: redesignPrompt },
                { type: "image_url", image_url: { url: originalImageUrl } }
              ]
            }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          console.error("❌ Redesign error:", response.status, await response.text());
        } else {
          const data = await response.json();
          const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (base64Url) {
            imageUrl = await uploadToStorage(base64Url);
            console.log("✅ Redesigned image ready:", imageUrl?.substring(0, 80));
          }
        }
      } catch (err) {
        console.error("❌ Redesign failed:", err);
      }

      if (!imageUrl) throw new Error("Failed to redesign image");

      return new Response(JSON.stringify({ success: true, imageUrl, message: "Image redesigned!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GENERATE MODE: Create new image from content ───
    const imagePrompt = buildImagePrompt(content, mode);
    console.log("📝 Mode:", mode, "| Prompt preview:", imagePrompt.substring(0, 150));

    // Try Lovable AI Gateway first
    if (LOVABLE_API_KEY) {
      console.log("🎨 Generating with Lovable AI...");
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: imagePrompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          console.error("❌ Lovable AI error:", response.status, await response.text());
        } else {
          const data = await response.json();
          const base64Url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (base64Url) {
            imageUrl = await uploadToStorage(base64Url);
            console.log("✅ Image ready:", imageUrl?.substring(0, 80));
          }
        }
      } catch (err) {
        console.error("❌ Lovable AI failed:", err);
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
              Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: imagePrompt,
              parameters: { width: 1024, height: 1024, num_inference_steps: 30, guidance_scale: 7.5 },
            }),
          }
        );

        if (hfResponse.ok && hfResponse.headers.get("content-type")?.includes("image")) {
          const arrayBuffer = await hfResponse.arrayBuffer();
          const supabaseUrl = Deno.env.get("SUPABASE_URL");
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const fileName = `hf-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const { data, error } = await supabase.storage
              .from("post-images")
              .upload(fileName, new Uint8Array(arrayBuffer), { contentType: "image/png", upsert: false });
            if (!error && data) {
              const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(fileName);
              imageUrl = publicUrl.publicUrl;
            }
          }
        }
      } catch (hfError) {
        console.error("❌ HF failed:", hfError);
      }
    }

    if (!imageUrl) throw new Error("Failed to generate image from any provider");

    return new Response(JSON.stringify({ success: true, imageUrl, message: "Image generated!" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate image error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Failed to generate image",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
