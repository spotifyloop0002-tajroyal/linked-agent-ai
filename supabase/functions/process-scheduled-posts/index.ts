import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "topcarszone@gmail.com";

async function sendFailureEmail(
  brevoApiKey: string,
  to: { email: string; name: string },
  post: { id: string; content: string; scheduled_time: string },
  errorMsg: string,
  isAdmin: boolean
) {
  const scheduledTime = new Date(post.scheduled_time).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
  const contentPreview = post.content.length > 150
    ? post.content.substring(0, 150) + "..."
    : post.content;

  const subject = isAdmin
    ? `🚨 Post Failed for ${to.name} – ${scheduledTime}`
    : `❌ Your LinkedIn post failed to publish`;

  const htmlContent = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
      <div style="background:linear-gradient(135deg,#DC2626,#B91C1C);padding:24px;border-radius:12px 12px 0 0;color:white;">
        <h1 style="margin:0;font-size:20px;">❌ Post Failed to Publish</h1>
        <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Your scheduled LinkedIn post could not be posted</p>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
        <div style="margin-bottom:16px;">
          <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Was Scheduled For</span>
          <p style="font-size:16px;font-weight:600;color:#111827;margin:4px 0;">${scheduledTime}</p>
        </div>
        ${isAdmin ? `
        <div style="margin-bottom:16px;">
          <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">User</span>
          <p style="font-size:14px;color:#111827;margin:4px 0;">${to.name} (${to.email})</p>
        </div>` : ""}
        <div style="margin-bottom:16px;">
          <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Error</span>
          <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:8px;padding:12px;margin-top:8px;">
            <p style="font-size:14px;color:#991B1B;margin:0;">${errorMsg}</p>
          </div>
        </div>
        <div style="margin-bottom:16px;">
          <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Post Preview</span>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:8px;white-space:pre-wrap;font-size:14px;line-height:1.6;color:#374151;">
${contentPreview}
          </div>
        </div>
        ${isAdmin ? `
        <div style="margin-bottom:16px;">
          <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Post ID</span>
          <p style="font-size:12px;font-family:monospace;color:#6b7280;margin:4px 0;">${post.id}</p>
        </div>` : ""}
        <p style="font-size:13px;color:#6b7280;margin-top:20px;text-align:center;">
          ${isAdmin ? "Please investigate this failure." : "Log in to LinkedBot to retry or reschedule this post."}
        </p>
      </div>
      <p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:16px;">
        LinkedBot • ${new Date().getFullYear()}
      </p>
    </div>`;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: "LinkedBot", email: "team@linkedbot.online" },
        to: [{ email: to.email, name: to.name }],
        subject,
        htmlContent,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[EMAIL] Failed to send to ${to.email}:`, text);
    } else {
      console.log(`[EMAIL] ✅ Failure notification sent to ${to.email}`);
    }
  } catch (err) {
    console.error(`[EMAIL] Exception sending to ${to.email}:`, err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const brevoApiKey = Deno.env.get("BREVO_API_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const now = new Date().toISOString();
    console.log(`[AUTO-POST] Processing scheduled posts at ${now}`);

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

    // Pre-fetch user profiles for all affected users
    const userIds = [...new Set(duePosts.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from("user_profiles")
      .select("user_id, name, email")
      .in("user_id", userIds);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

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
          await supabase.from("posts").update({
            status: "failed",
            last_error: errorMsg,
          }).eq("id", post.id);
          results.push({ postId: post.id, success: false, error: errorMsg });

          // Send failure notifications
          const profile = profileMap.get(post.user_id);

          // In-app notification for user
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            title: "❌ Post failed to publish",
            message: `Your scheduled post failed: ${errorMsg}. Post: "${post.content.substring(0, 60)}..."`,
            type: "post_failed",
          });

          // Email to user
          if (brevoApiKey && profile?.email) {
            await sendFailureEmail(
              brevoApiKey,
              { email: profile.email, name: profile.name || "User" },
              post,
              errorMsg,
              false
            );
          }

          // Email to admin
          if (brevoApiKey) {
            await sendFailureEmail(
              brevoApiKey,
              { email: ADMIN_EMAIL, name: profile?.name || "Unknown User" },
              post,
              errorMsg,
              true
            );
          }

          // Log notification
          await supabase.from("notification_log").insert({
            user_id: post.user_id,
            post_id: post.id,
            campaign_id: post.campaign_id,
            type: "post_failed",
            title: "Post Failed",
            message: `Post failed: ${errorMsg}`,
            status: "sent",
            sent_at: new Date().toISOString(),
          });
        }
      } catch (postError) {
        const errorMsg = postError instanceof Error ? postError.message : String(postError);
        console.error(`[AUTO-POST] ❌ Post ${post.id} exception: ${errorMsg}`);
        await supabase.from("posts").update({
          status: "failed",
          last_error: errorMsg,
        }).eq("id", post.id);
        results.push({ postId: post.id, success: false, error: errorMsg });

        // Send failure notifications for exceptions too
        const profile = profileMap.get(post.user_id);

        await supabase.from("notifications").insert({
          user_id: post.user_id,
          title: "❌ Post failed to publish",
          message: `Your scheduled post encountered an error: ${errorMsg}`,
          type: "post_failed",
        });

        if (brevoApiKey && profile?.email) {
          await sendFailureEmail(
            brevoApiKey,
            { email: profile.email, name: profile.name || "User" },
            post,
            errorMsg,
            false
          );
        }

        if (brevoApiKey) {
          await sendFailureEmail(
            brevoApiKey,
            { email: ADMIN_EMAIL, name: profile?.name || "Unknown User" },
            post,
            errorMsg,
            true
          );
        }
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
