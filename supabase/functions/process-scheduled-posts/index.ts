import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Auto-posting cron function.
 * Runs every 5 minutes via pg_cron.
 * Finds pending posts whose scheduled_time has passed and publishes them via linkedin-post.
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();
    console.log(`[AUTO-POST] Processing scheduled posts at ${now}`);

    // Find pending posts that are due (scheduled_time <= now)
    // Also include posts up to 7 days overdue
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: duePosts, error: fetchError } = await supabase
      .from("posts")
      .select("id, content, photo_url, user_id, scheduled_time, campaign_id")
      .eq("status", "pending")
      .lte("scheduled_time", now)
      .gte("scheduled_time", sevenDaysAgo)
      .order("scheduled_time", { ascending: true })
      .limit(10);

    if (fetchError) {
      console.error("[AUTO-POST] Fetch error:", fetchError);
      throw fetchError;
    }

    if (!duePosts || duePosts.length === 0) {
      console.log("[AUTO-POST] No posts due for publishing.");
      return new Response(
        JSON.stringify({ success: true, postsProcessed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AUTO-POST] Found ${duePosts.length} posts to publish`);

    const results: { postId: string; success: boolean; error?: string }[] = [];

    for (const post of duePosts) {
      try {
        console.log(`[AUTO-POST] Publishing post ${post.id} for user ${post.user_id}`);

        // Mark as posting to prevent double-processing
        await supabase.from("posts").update({ status: "posting" }).eq("id", post.id);

        // Call linkedin-post edge function
        const response = await fetch(`${supabaseUrl}/functions/v1/linkedin-post`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postId: post.id,
            content: post.content,
            imageUrl: post.photo_url || undefined,
            userId: post.user_id,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          console.log(`[AUTO-POST] ✅ Post ${post.id} published successfully`);
          results.push({ postId: post.id, success: true });
        } else {
          const errorMsg = result.error || "Unknown error";
          console.error(`[AUTO-POST] ❌ Post ${post.id} failed: ${errorMsg}`);
          // linkedin-post already marks as failed, but ensure it
          await supabase.from("posts").update({
            status: "failed",
            last_error: errorMsg,
          }).eq("id", post.id);
          results.push({ postId: post.id, success: false, error: errorMsg });
        }
      } catch (postError) {
        const errorMsg = postError instanceof Error ? postError.message : String(postError);
        console.error(`[AUTO-POST] ❌ Post ${post.id} exception: ${errorMsg}`);
        await supabase.from("posts").update({
          status: "failed",
          last_error: errorMsg,
        }).eq("id", post.id);
        results.push({ postId: post.id, success: false, error: errorMsg });
      }

      // Small delay between posts to avoid rate limiting
      if (duePosts.indexOf(post) < duePosts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`[AUTO-POST] Done: ${succeeded} published, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        postsProcessed: results.length,
        succeeded,
        failed,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[AUTO-POST] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
