import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const now = new Date().toISOString();

    // Find all users with expired subscriptions still marked as paid
    const { data: expiredUsers, error } = await supabase
      .from("user_profiles")
      .select("user_id, email, name, subscription_plan, subscription_expires_at")
      .in("subscription_plan", ["pro", "business", "custom"])
      .not("subscription_expires_at", "is", null)
      .lt("subscription_expires_at", now);

    if (error) {
      console.error("Error fetching expired subscriptions:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch expired subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredUsers || expiredUsers.length === 0) {
      console.log("No expired subscriptions found");
      return new Response(
        JSON.stringify({ processed: 0, message: "No expired subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredUsers.length} expired subscriptions to downgrade`);

    let processed = 0;
    const errors: string[] = [];

    for (const user of expiredUsers) {
      try {
        // Downgrade to free plan
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            subscription_plan: "free",
            updated_at: now,
          })
          .eq("user_id", user.user_id);

        if (updateError) {
          errors.push(`Failed to downgrade ${user.user_id}: ${updateError.message}`);
          continue;
        }

        // Create notification for the user
        await supabase.from("notifications").insert({
          user_id: user.user_id,
          title: "Subscription Expired",
          message: `Your ${user.subscription_plan?.charAt(0).toUpperCase()}${user.subscription_plan?.slice(1)} plan has expired. You've been moved to the Free plan. Renew to restore your features.`,
          type: "billing",
        });

        // Send expiry email via Brevo
        const brevoApiKey = Deno.env.get("BREVO_API_KEY");
        if (brevoApiKey && user.email) {
          const planName = user.subscription_plan?.charAt(0).toUpperCase() + user.subscription_plan?.slice(1);
          const userName = user.name || "there";
          
          try {
            await fetch("https://api.brevo.com/v3/smtp/email", {
              method: "POST",
              headers: {
                "api-key": brevoApiKey,
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                sender: { name: "LinkedBot", email: "aryanbhatnagar.2601@gmail.com" },
                to: [{ email: user.email }],
                subject: `⚠️ Your LinkedBot ${planName} Plan Has Expired`,
                htmlContent: `
                  <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                    <div style="background: linear-gradient(135deg, #f59e0b, #ef4444); padding: 32px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚠️ Subscription Expired</h1>
                    </div>
                    <div style="padding: 32px;">
                      <p style="font-size: 16px; color: #374151;">Hi ${userName},</p>
                      <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
                        Your <strong>${planName} plan</strong> has expired. Your account has been moved to the Free plan.
                      </p>
                      <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
                        Don't worry — your posts and data are safe. Renew your subscription to continue using all features.
                      </p>
                      <div style="text-align: center; margin-top: 24px;">
                        <a href="https://linkedbotremix.lovable.app/dashboard/billing" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">Renew Now</a>
                      </div>
                    </div>
                    <div style="background: #f9fafb; padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="font-size: 12px; color: #9ca3af; margin: 0;">© ${new Date().getFullYear()} LinkedBot. All rights reserved.</p>
                    </div>
                  </div>
                `,
              }),
            });
          } catch (emailErr) {
            console.error("Failed to send expiry email:", emailErr);
          }
        }

        processed++;
        console.log(`Downgraded user ${user.user_id} from ${user.subscription_plan} to free`);
      } catch (userErr) {
        errors.push(`Error processing ${user.user_id}: ${String(userErr)}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        processed, 
        total: expiredUsers.length, 
        errors: errors.length > 0 ? errors : undefined 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Subscription check error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
