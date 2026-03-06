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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const now = new Date().toISOString();

    // Find pending posts that are due (limit 10 overall)
    const { data: duePosts, error: fetchErr } = await supabase
      .from("posts")
      .select("*, campaigns(*)")
      .eq("status", "pending")
      .lte("scheduled_time", now)
      .order("scheduled_time", { ascending: true })
      .limit(10);

    if (fetchErr) throw fetchErr;
    if (!duePosts || duePosts.length === 0) {
      return new Response(JSON.stringify({ message: "No due posts" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // THROTTLE: For campaign posts, limit to posts_per_day per campaign per day
    // Count how many posts were already posted today per campaign
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const campaignIds = [...new Set(duePosts.filter(p => p.campaign_id).map(p => p.campaign_id))];
    const campaignPostsToday: Record<string, number> = {};
    const campaignLimits: Record<string, number> = {};

    for (const campId of campaignIds) {
      // Count already-posted today for this campaign
      const { count } = await supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campId)
        .eq("status", "posted")
        .gte("posted_at", todayStart.toISOString())
        .lte("posted_at", todayEnd.toISOString());

      campaignPostsToday[campId] = count || 0;

      // Get campaign's posts_per_day limit
      const camp = duePosts.find(p => p.campaign_id === campId)?.campaigns;
      campaignLimits[campId] = camp?.posts_per_day || 1;
    }

    // Filter: skip campaign posts that would exceed daily limit
    // Also skip posts scheduled more than 24 hours in the past (stale)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const filteredPosts = duePosts.filter(post => {
      // Skip stale posts (>24h overdue)
      if (post.scheduled_time < sevenDaysAgo) {
        console.log(`⏭️ Skipping stale post ${post.id} (scheduled ${post.scheduled_time})`);
        return false;
      }

      if (post.campaign_id) {
        const limit = campaignLimits[post.campaign_id] || 1;
        const alreadyPosted = campaignPostsToday[post.campaign_id] || 0;
        if (alreadyPosted >= limit) {
          console.log(`⏭️ Campaign ${post.campaign_id} daily limit reached (${alreadyPosted}/${limit})`);
          return false;
        }
        // Reserve a slot
        campaignPostsToday[post.campaign_id] = alreadyPosted + 1;
      }
      return true;
    });

    if (filteredPosts.length === 0) {
      return new Response(JSON.stringify({ message: "No eligible posts (daily limits reached)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any[] = [];

    for (const post of filteredPosts) {
      try {
        // Update status to 'posting'
        await supabase.from("posts").update({ status: "posting", updated_at: now }).eq("id", post.id);

        // Fetch user's LinkedIn credentials
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("linkedin_access_token, linkedin_id")
          .eq("user_id", post.user_id)
          .single();

        if (!profile?.linkedin_access_token || !profile?.linkedin_id) {
          // Mark as failed
          await supabase.from("posts").update({
            status: "failed",
            last_error: "LinkedIn not connected. Please connect your LinkedIn account.",
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);

          results.push({ postId: post.id, status: "failed", reason: "No LinkedIn credentials" });
          continue;
        }

        // Post to LinkedIn using the linkedin-post edge function (service-role key for server-to-server)
        const linkedinResponse = await fetch(`${supabaseUrl}/functions/v1/linkedin-post`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            userId: post.user_id,
            postId: post.id,
            content: post.content,
            imageUrl: post.photo_url || undefined,
          }),
        });

        const linkedinResult = await linkedinResponse.json();

        if (linkedinResponse.ok && linkedinResult.success) {
          // Success - update post
          await supabase.from("posts").update({
            status: "posted",
            posted_at: new Date().toISOString(),
            linkedin_post_id: linkedinResult.postId || null,
            linkedin_post_url: linkedinResult.postUrl || null,
            updated_at: new Date().toISOString(),
          }).eq("id", post.id);

          // Update user profile counts
          await supabase.rpc("increment_daily_post_count", { p_user_id: post.user_id });

          // Create success notification
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            title: "✅ Post published!",
            message: `Your scheduled post about "${post.content.substring(0, 50)}..." has been published to LinkedIn.`,
            type: "post_success",
          });

          results.push({ postId: post.id, status: "posted" });
        } else {
          // Failed
          const retryCount = (post.retry_count || 0) + 1;
          const maxRetries = 3;

          if (retryCount < maxRetries) {
            // Schedule retry in 5 minutes
            const retryAt = new Date();
            retryAt.setMinutes(retryAt.getMinutes() + 5);

            await supabase.from("posts").update({
              status: "pending",
              retry_count: retryCount,
              last_error: linkedinResult.error || "LinkedIn posting failed",
              next_retry_at: retryAt.toISOString(),
              scheduled_time: retryAt.toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", post.id);

            results.push({ postId: post.id, status: "retrying", attempt: retryCount });
          } else {
            // Max retries reached
            await supabase.from("posts").update({
              status: "failed",
              retry_count: retryCount,
              last_error: linkedinResult.error || "LinkedIn posting failed after 3 attempts",
              updated_at: new Date().toISOString(),
            }).eq("id", post.id);

            // Alert user
            await supabase.from("notifications").insert({
              user_id: post.user_id,
              title: "❌ Post failed",
              message: `Your post failed after 3 attempts: "${post.content.substring(0, 50)}..."`,
              type: "post_failed",
            });

            results.push({ postId: post.id, status: "failed", reason: "Max retries reached" });
          }
        }
      } catch (postError) {
        console.error(`Error posting ${post.id}:`, postError);
        await supabase.from("posts").update({
          status: "failed",
          last_error: String(postError),
          updated_at: new Date().toISOString(),
        }).eq("id", post.id);
        results.push({ postId: post.id, status: "failed", reason: String(postError) });
      }
    }

    // Check for completed campaigns
    const completionCampaignIds = [...new Set(filteredPosts.filter(p => p.campaign_id).map(p => p.campaign_id))];
    for (const campId of completionCampaignIds) {
      const { data: remainingPosts } = await supabase
        .from("posts")
        .select("id")
        .eq("campaign_id", campId)
        .in("status", ["pending", "posting", "draft"]);

      if (!remainingPosts || remainingPosts.length === 0) {
        await supabase.from("campaigns").update({ status: "completed" }).eq("id", campId);

        // Get campaign info for notification
        const { data: camp } = await supabase.from("campaigns").select("user_id, topic").eq("id", campId).single();
        if (camp) {
          await supabase.from("notifications").insert({
            user_id: camp.user_id,
            title: "🎉 Campaign complete!",
            message: `Your "${camp.topic}" campaign has finished. Check your analytics for results!`,
            type: "campaign_complete",
          });
        }
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Auto-post cron error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
