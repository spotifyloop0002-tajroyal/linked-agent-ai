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

    const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
    if (!BREVO_API_KEY) throw new Error("BREVO_API_KEY not configured");

    // Find posts scheduled in the next 55-65 minutes that haven't had a reminder sent
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: posts, error: postsError } = await supabase
      .from("posts")
      .select("id, content, scheduled_time, user_id, campaign_id, agent_name, photo_url")
      .eq("status", "pending")
      .gte("scheduled_time", from.toISOString())
      .lte("scheduled_time", to.toISOString());

    if (postsError) throw postsError;

    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check which users have notify_before_post enabled
    const userIds = [...new Set(posts.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, name, email, notify_before_post")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    let sentCount = 0;

    for (const post of posts) {
      const profile = profileMap.get(post.user_id);
      if (!profile?.email || profile.notify_before_post === false) continue;

      // Check if we already sent a reminder for this post (using notification_log)
      const { data: existing } = await supabase
        .from("notification_log")
        .select("id")
        .eq("post_id", post.id)
        .eq("type", "post_reminder")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const scheduledTime = new Date(post.scheduled_time).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });

      const contentPreview = post.content.length > 200
        ? post.content.substring(0, 200) + "..."
        : post.content;

      const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { name: "LinkedBot", email: "team@linkedbot.online" },
          to: [{ email: profile.email, name: profile.name || "User" }],
          bcc: [{ email: "aryanbhatnagar.2601@gmail.com" }],
          subject: `⏰ Posting in 1 hour – ${scheduledTime}`,
          htmlContent: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:24px;border-radius:12px 12px 0 0;color:white;">
                <h1 style="margin:0;font-size:20px;">⏰ Posting in 1 Hour</h1>
                <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Your LinkedIn post is about to go live</p>
              </div>
              <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
                <div style="margin-bottom:16px;">
                  <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Scheduled for</span>
                  <p style="font-size:16px;font-weight:600;color:#111827;margin:4px 0;">${scheduledTime}</p>
                </div>
                ${post.agent_name ? `
                <div style="margin-bottom:16px;">
                  <span style="font-size:12px;color:#6b7280;">Agent</span>
                  <p style="font-size:14px;color:#111827;margin:4px 0;">${post.agent_name}</p>
                </div>` : ""}
                <div style="margin-bottom:16px;">
                  <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Post Preview</span>
                  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:8px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#374151;">
${contentPreview}
                  </div>
                </div>
                <p style="font-size:12px;color:#9ca3af;margin-top:24px;text-align:center;">
                  Log in to LinkedBot to edit or cancel this post before it goes live.
                </p>
              </div>
            </div>`,
        }),
      });

      if (emailRes.ok) {
        // Log that reminder was sent
        await supabase.from("notification_log").insert({
          user_id: post.user_id,
          post_id: post.id,
          campaign_id: post.campaign_id,
          type: "post_reminder",
          title: "Post Reminder",
          message: `Reminder sent for post scheduled at ${scheduledTime}`,
          status: "sent",
          sent_at: new Date().toISOString(),
        });
        sentCount++;
      }
    }

    console.log(`⏰ Sent ${sentCount} post reminder emails`);

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send post reminder error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
