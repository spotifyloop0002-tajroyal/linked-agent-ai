import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Plan pricing
export const PLAN_PRICING = {
  pro: { usd: 12, inr: 999, usdYearly: 120, inrYearly: 9999 },
  business: { usd: 22, inr: 1999, usdYearly: 220, inrYearly: 19999 },
};

interface CouponValidation {
  valid: boolean;
  code?: string;
  type?: "percentage" | "fixed";
  value?: number;
  restrictedPlan?: string | null;
  discounts?: Record<string, number>;
  error?: string;
}

interface PaymentResult {
  success: boolean;
  type?: "free_access" | "razorpay_order" | "verified";
  message?: string;
  plan?: string;
  expiresAt?: string;
  orderId?: string;
  amount?: number;
  originalAmount?: number;
  discountAmount?: number;
  keyId?: string;
  billingPeriod?: string;
  error?: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export type BillingPeriod = "monthly" | "yearly";

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [couponValidation, setCouponValidation] = useState<CouponValidation | null>(null);

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const validateCoupon = useCallback(async (code: string): Promise<CouponValidation> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-payment", {
        body: { action: "validate_coupon", couponCode: code },
      });
      if (error) throw error;
      setCouponValidation(data);
      return data;
    } catch (err: any) {
      const result = { valid: false, error: err.message || "Failed to validate coupon" };
      setCouponValidation(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCoupon = useCallback(() => {
    setCouponValidation(null);
  }, []);

  const createPayment = useCallback(async (
    plan: "pro" | "business",
    couponCode?: string,
    onSuccess?: (result: PaymentResult) => void,
    billingPeriod: BillingPeriod = "monthly"
  ): Promise<PaymentResult> => {
    setIsLoading(true);

    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke("razorpay-payment", {
        body: { action: "create_order", plan, couponCode, billingPeriod },
      });

      if (orderError) throw orderError;
      if (orderData.error) throw new Error(orderData.error);

      if (orderData.type === "free_access") {
        toast.success("🎉 " + orderData.message);
        onSuccess?.(orderData);
        return orderData;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Failed to load payment gateway");
      }

      return new Promise((resolve, reject) => {
        const periodLabel = billingPeriod === "yearly" ? "Yearly" : "Monthly";
        const options = {
          key: orderData.keyId,
          amount: orderData.amount * 100,
          currency: orderData.currency,
          name: "LinkedBot",
          description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan – ${periodLabel}`,
          order_id: orderData.orderId,
          handler: async (response: any) => {
            try {
              const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-payment", {
                body: {
                  action: "verify_payment",
                  paymentData: {
                    orderId: orderData.orderId,
                    paymentId: response.razorpay_payment_id,
                    signature: response.razorpay_signature,
                    billingPeriod,
                  },
                },
              });

              if (verifyError) throw verifyError;
              if (verifyData.error) throw new Error(verifyData.error);

              toast.success("🎉 Payment successful! Welcome to " + plan.charAt(0).toUpperCase() + plan.slice(1) + "!");
              onSuccess?.(verifyData);
              resolve(verifyData);
            } catch (err: any) {
              toast.error("Payment verification failed: " + err.message);
              reject(err);
            } finally {
              setIsLoading(false);
            }
          },
          prefill: {},
          theme: { color: "#6366f1" },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              resolve({ success: false, error: "Payment cancelled" });
            },
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on("payment.failed", (response: any) => {
          toast.error("Payment failed: " + response.error.description);
          setIsLoading(false);
          resolve({ success: false, error: response.error.description });
        });
        razorpay.open();
      });

    } catch (err: any) {
      toast.error(err.message || "Payment failed");
      setIsLoading(false);
      return { success: false, error: err.message };
    }
  }, [loadRazorpayScript]);

  const calculateFinalPrice = useCallback((
    plan: "pro" | "business",
    coupon?: CouponValidation | null,
    billingPeriod: BillingPeriod = "monthly"
  ): { original: number; discount: number; final: number } => {
    const pricing = PLAN_PRICING[plan];
    const original = billingPeriod === "yearly" ? pricing.inrYearly : pricing.inr;
    let discount = 0;

    if (coupon?.valid && coupon.discounts) {
      const key = billingPeriod === "yearly" ? `${plan}_yearly` : plan;
      discount = coupon.discounts[key] || 0;
    }

    return {
      original,
      discount,
      final: Math.max(0, original - discount),
    };
  }, []);

  return {
    isLoading,
    couponValidation,
    validateCoupon,
    clearCoupon,
    createPayment,
    calculateFinalPrice,
    PLAN_PRICING,
  };
}
