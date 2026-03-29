import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaignId, limit = 5 } = await req.json();

    // Find posts with missing images from campaigns that have image_option=ai
    let query = supabase
      .from("posts")
      .select("id, content, campaign_id")
      .is("photo_url", null)
      .eq("status", "pending")
      .order("scheduled_time", { ascending: true })
      .limit(limit);

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data: posts, error } = await query;
    if (error) throw error;
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts need images", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify these campaigns actually want AI images
    const campaignIds = [...new Set(posts.map(p => p.campaign_id).filter(Boolean))];
    const { data: campaigns } = await supabase
      .from("campaigns")
      .select("id, image_option")
      .in("id", campaignIds)
      .eq("image_option", "ai");

    const aiCampaignIds = new Set((campaigns || []).map(c => c.id));
    const postsToProcess = posts.filter(p => p.campaign_id && aiCampaignIds.has(p.campaign_id));

    if (postsToProcess.length === 0) {
      return new Response(JSON.stringify({ message: "No AI-image campaign posts need images", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🎨 Backfilling ${postsToProcess.length} images...`);

    let generated = 0;
    for (const post of postsToProcess) {
      try {
        const prompt = `Create a meaningful, concept-driven image for a LinkedIn post.
CONTENT: "${post.content.substring(0, 200)}"
DESIGN: Modern minimal illustration, soft gradients, professional, 1:1 aspect ratio, scroll-stopping.
AVOID: Random icons, generic AI graphics, cluttered templates, stock clip art.
STYLE: Clean, modern, conceptual — like a high-end design studio piece.`;

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

        if (!imgResponse.ok) {
          console.warn(`⚠️ Image gen failed for post ${post.id}: ${imgResponse.status}`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        const imgData = await imgResponse.json();
        const base64Url = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!base64Url) {
          console.warn(`⚠️ No image returned for post ${post.id}`);
          continue;
        }

        // Upload to storage
        const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        const fileName = `backfill-${post.id}-${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
          .from("post-images")
          .upload(fileName, binaryData, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error(`Upload failed for ${post.id}:`, uploadError);
          continue;
        }

        const { data: publicUrl } = supabase.storage.from("post-images").getPublicUrl(fileName);

        // Update post with image
        await supabase
          .from("posts")
          .update({ photo_url: publicUrl.publicUrl })
          .eq("id", post.id);

        generated++;
        console.log(`✅ Image ${generated}/${postsToProcess.length} done for post ${post.id}`);

        // Delay between requests
        if (generated < postsToProcess.length) {
          await new Promise(r => setTimeout(r, 1500));
        }
      } catch (err) {
        console.error(`Failed for post ${post.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ 
      message: `Generated ${generated}/${postsToProcess.length} images`,
      count: generated 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
