import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

function getDurationDays(billingPeriod: string): number {
  if (billingPeriod === "yearly") return 365;
  if (billingPeriod === "quarterly") return 90;
  return 30;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const rawBody = await req.text();
    const razorpaySignature = req.headers.get("x-razorpay-signature");

    if (!razorpaySignature) {
      console.error("Missing x-razorpay-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const expectedSignature = createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(rawBody)
      .digest("hex");

    if (razorpaySignature !== expectedSignature) {
      console.error("Webhook signature verification failed");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = JSON.parse(rawBody);
    console.log("Razorpay webhook event:", event.event);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle payment.captured event
    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;
      const amount = payment.amount / 100; // Convert from paise to INR

      console.log(`Payment captured: order=${orderId}, payment=${paymentId}, amount=₹${amount}`);

      // Check if payment already processed
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("*")
        .eq("razorpay_order_id", orderId)
        .single();

      if (!existingPayment) {
        console.log("No matching payment record found for order:", orderId);
        return new Response(
          JSON.stringify({ status: "no_matching_order" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If already successful, skip (idempotent)
      if (existingPayment.status === "success") {
        console.log("Payment already processed, skipping:", orderId);
        return new Response(
          JSON.stringify({ status: "already_processed" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment record
      await supabase
        .from("payments")
        .update({
          razorpay_payment_id: paymentId,
          status: "success",
          payment_method: payment.method || "razorpay",
        })
        .eq("razorpay_order_id", orderId);

      // Determine billing period from order notes
      const billingPeriod = payment.notes?.billing_period || "monthly";
      const durationDays = getDurationDays(billingPeriod);
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + durationDays);

      // Activate subscription
      await supabase
        .from("user_profiles")
        .update({
          subscription_plan: existingPayment.plan,
          subscription_expires_at: expiryDate.toISOString(),
          billing_period: billingPeriod,
        })
        .eq("user_id", existingPayment.user_id);

      // Increment coupon usage if applicable
      if (existingPayment.coupon_id) {
        const { data: couponData } = await supabase
          .from("coupons")
          .select("current_uses")
          .eq("id", existingPayment.coupon_id)
          .single();
        if (couponData) {
          await supabase
            .from("coupons")
            .update({ current_uses: (couponData.current_uses || 0) + 1 })
            .eq("id", existingPayment.coupon_id);
        }
      }

      console.log(`Subscription activated via webhook: user=${existingPayment.user_id}, plan=${existingPayment.plan}`);
    }

    // Handle payment.failed event
    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const errorDesc = event.payload.payment.entity.error_description || "Payment failed";

      console.log(`Payment failed: order=${orderId}, reason=${errorDesc}`);

      await supabase
        .from("payments")
        .update({
          status: "failed",
          error_message: errorDesc,
        })
        .eq("razorpay_order_id", orderId);
    }

    return new Response(
      JSON.stringify({ status: "ok" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
