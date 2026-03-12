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

    const { campaignId, type } = await req.json();
    if (!campaignId) {
      return new Response(JSON.stringify({ error: "campaignId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign
    const { data: campaign, error: campError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("name, email")
      .eq("user_id", campaign.user_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign posts for calendar preview
    const { data: posts } = await supabase
      .from("posts")
      .select("scheduled_time, content, status")
      .eq("campaign_id", campaignId)
      .order("scheduled_time", { ascending: true });

    const postingDays = (campaign.posting_days || []).join(", ");
    const agentType = campaign.agent_type || campaign.tone_type || "professional";

    // Build calendar preview
    let calendarHtml = "";
    if (posts && posts.length > 0) {
      const postRows = posts.slice(0, 10).map((p: any) => {
        const date = new Date(p.scheduled_time).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        const time = new Date(p.scheduled_time).toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
        });
        const preview = p.content.substring(0, 60) + (p.content.length > 60 ? "..." : "");
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151;">${date}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${time}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280;">${preview}</td>
        </tr>`;
      }).join("");

      calendarHtml = `
        <div style="margin-top:16px;">
          <p style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">📅 Upcoming Posts</p>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;">Date</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;">Time</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;">Preview</th>
              </tr>
            </thead>
            <tbody>${postRows}</tbody>
          </table>
          ${posts.length > 10 ? `<p style="font-size:12px;color:#9ca3af;margin-top:8px;">+ ${posts.length - 10} more posts</p>` : ""}
        </div>`;
    }

    let subject = "";
    let htmlContent = "";

    if (type === "campaign_created") {
      subject = `🤖 Agent Campaign Created – ${campaign.campaign_name || campaign.topic}`;
      htmlContent = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:linear-gradient(135deg,#0284c7,#0369a1);padding:24px;border-radius:12px 12px 0 0;color:white;">
            <h1 style="margin:0;font-size:20px;">🤖 Agent Campaign Created!</h1>
            <p style="margin:8px 0 0;opacity:0.9;font-size:14px;">Your AI intern is ready to manage your LinkedIn content</p>
          </div>
          <div style="background:#ffffff;border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
            <div style="margin-bottom:12px;">
              <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Campaign</span>
              <p style="font-size:16px;font-weight:600;color:#111827;margin:4px 0;">${campaign.campaign_name || campaign.topic}</p>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
              <div>
                <span style="font-size:12px;color:#6b7280;">Agent Type</span>
                <p style="font-size:14px;color:#111827;margin:4px 0;">${agentType.charAt(0).toUpperCase() + agentType.slice(1)}</p>
              </div>
              <div>
                <span style="font-size:12px;color:#6b7280;">Total Posts</span>
                <p style="font-size:14px;color:#111827;margin:4px 0;">${posts?.length || campaign.post_count}</p>
              </div>
              <div>
                <span style="font-size:12px;color:#6b7280;">Posting Days</span>
                <p style="font-size:14px;color:#111827;margin:4px 0;">${postingDays || "All days"}</p>
              </div>
              <div>
                <span style="font-size:12px;color:#6b7280;">Posting Time</span>
                <p style="font-size:14px;color:#111827;margin:4px 0;">${campaign.posting_time || "Auto"}</p>
              </div>
            </div>
            ${calendarHtml}
            <p style="font-size:12px;color:#9ca3af;margin-top:24px;text-align:center;">
              Log in to LinkedBot to review and approve your posts.
            </p>
          </div>
        </div>`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown email type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        subject,
        htmlContent,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Brevo error:", errText);
      throw new Error(`Email send failed: ${emailRes.status}`);
    }

    console.log(`📧 Campaign ${type} email sent for ${campaignId} to ${profile.email}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send campaign email error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
