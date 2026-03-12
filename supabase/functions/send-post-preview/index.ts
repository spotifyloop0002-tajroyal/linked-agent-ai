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

    const { postId } = await req.json();
    if (!postId) {
      return new Response(JSON.stringify({ error: "postId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch post
    const { data: post, error: postError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("name, email")
      .eq("user_id", post.user_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scheduledTime = post.scheduled_time
      ? new Date(post.scheduled_time).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Soon";

    const contentPreview = post.content.length > 500
      ? post.content.substring(0, 500) + "..."
      : post.content;

    // Send email via Brevo
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
        subject: `📋 Post Preview – Scheduled for ${scheduledTime}`,
        htmlContent: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 24px; border-radius: 12px 12px 0 0; color: white;">
              <h1 style="margin: 0; font-size: 20px;">🤖 LinkedBot Post Preview</h1>
              <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Your AI intern has prepared a post for review</p>
            </div>
            
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <div style="margin-bottom: 16px;">
                <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Scheduled for</span>
                <p style="font-size: 16px; font-weight: 600; color: #111827; margin: 4px 0;">${scheduledTime}</p>
              </div>
              
              ${post.agent_name ? `
              <div style="margin-bottom: 16px;">
                <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Agent Type</span>
                <p style="font-size: 14px; color: #111827; margin: 4px 0;">${post.agent_name}</p>
              </div>
              ` : ""}
              
              <div style="margin-bottom: 16px;">
                <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Post Content</span>
                <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-top: 8px; white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #374151;">
${contentPreview}
                </div>
              </div>

              ${post.photo_url ? `
              <div style="margin-bottom: 16px;">
                <span style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Image</span>
                <img src="${post.photo_url}" alt="Post image" style="max-width: 100%; border-radius: 8px; margin-top: 8px;" />
              </div>
              ` : ""}

              <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; text-align: center;">
                This post will be automatically published at the scheduled time.<br>
                Log in to LinkedBot to edit or cancel.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Brevo error:", errText);
      throw new Error(`Email send failed: ${emailRes.status}`);
    }

    // Mark that preview was sent
    await supabase
      .from("posts")
      .update({ last_error: null })
      .eq("id", postId);

    console.log(`📧 Preview email sent for post ${postId} to ${profile.email}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Send preview error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
