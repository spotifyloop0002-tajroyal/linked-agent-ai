import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSubscription, PLAN_LIMITS } from "@/hooks/useSubscription";
import { usePayment, PLAN_PRICING, BillingPeriod } from "@/hooks/usePayment";
import { usePageTitle } from "@/hooks/usePageTitle";
import { 
  CreditCard, 
  Check, 
  Crown, 
  Zap, 
  Rocket, 
  Tag,
  Calendar,
  BarChart3,
  Bot,
  Loader2,
  X,
  Sparkles,
  HelpCircle,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const planIcons = {
  free: Zap,
  pro: Crown,
  business: Rocket,
};

const planColors = {
  free: "bg-muted text-muted-foreground",
  pro: "bg-primary text-primary-foreground",
  business: "bg-secondary text-secondary-foreground",
};

const BillingPage = () => {
  usePageTitle("Billing");
  const { status, isLoading: subscriptionLoading, fetchSubscriptionStatus } = useSubscription();
  const { 
    isLoading: paymentLoading, 
    couponValidation, 
    validateCoupon, 
    clearCoupon, 
    createPayment,
    calculateFinalPrice,
  } = usePayment();

  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "business" | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    const result = await validateCoupon(couponCode);
    setIsApplyingCoupon(false);
    if (result.valid) {
      toast.success("Coupon applied successfully!");
    } else {
      toast.error(result.error || "Invalid coupon code");
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponCode("");
    toast.info("Coupon removed");
  };

  const handleUpgrade = async (plan: "pro" | "business") => {
    setSelectedPlan(plan);
    const result = await createPayment(
      plan,
      couponValidation?.valid ? couponValidation.code : undefined,
      async () => {
        await fetchSubscriptionStatus();
        setSelectedPlan(null);
        clearCoupon();
        setCouponCode("");
      },
      billingPeriod
    );
    if (!result.success && result.error !== "Payment cancelled") {
      toast.error(result.error || "Payment failed");
    }
    setSelectedPlan(null);
  };

  if (subscriptionLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const PlanIcon = planIcons[status?.plan || "free"];
  const currentLimits = status?.limits || PLAN_LIMITS.free;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Manage your subscription and billing details
          </p>
        </div>

        {/* Current Plan */}
        <div className="animate-fade-up [animation-delay:100ms]">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status?.plan === "free" ? "bg-muted" : "gradient-bg"}`}>
                    <PlanIcon className={`w-6 h-6 ${status?.plan === "free" ? "text-foreground" : "text-primary-foreground"}`} />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {status?.plan?.charAt(0).toUpperCase()}{status?.plan?.slice(1)} Plan
                      <Badge className={planColors[status?.plan || "free"]}>
                        {status?.plan === "free" ? "Current" : "Active"}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {status?.expiresAt 
                        ? `Expires on ${format(new Date(status.expiresAt), "MMMM d, yyyy")}`
                        : status?.plan === "free" ? "Free forever" : "Active subscription"
                      }
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Usage Stats */}
        <div className="animate-fade-up [animation-delay:200ms] grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Daily Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{status?.postsToday || 0} used</span>
                  <span className="text-muted-foreground">{currentLimits.postsPerDay} limit</span>
                </div>
                <Progress value={((status?.postsToday || 0) / currentLimits.postsPerDay) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Monthly Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{status?.postsThisMonth || 0} used</span>
                  <span className="text-muted-foreground">{currentLimits.postsPerMonth} limit</span>
                </div>
                <Progress value={((status?.postsThisMonth || 0) / currentLimits.postsPerMonth) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Active Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{status?.agentsCount || 0} active</span>
                  <span className="text-muted-foreground">
                    {currentLimits.agents === -1 ? "Unlimited" : `${currentLimits.agents} limit`}
                  </span>
                </div>
                <Progress value={currentLimits.agents === -1 ? 10 : ((status?.agentsCount || 0) / currentLimits.agents) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coupon Code */}
        <div className="animate-fade-up [animation-delay:300ms]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary" />
                Apply Coupon Code
              </CardTitle>
              <CardDescription>
                Have a coupon code? Enter it below to get a discount on your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="max-w-sm"
                      disabled={!!couponValidation?.valid}
                    />
                    {couponValidation?.valid ? (
                      <Button variant="outline" onClick={handleRemoveCoupon}>
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    ) : (
                      <Button onClick={handleApplyCoupon} disabled={!couponCode.trim() || isApplyingCoupon}>
                        {isApplyingCoupon ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Apply
                      </Button>
                    )}
                  </div>
                  {couponValidation?.valid && (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
                      <Check className="w-4 h-4" />
                      <span>
                        Coupon <strong>{couponValidation.code}</strong> applied! 
                        {couponValidation.type === "percentage" 
                          ? ` ${couponValidation.value}% off`
                          : ` ₹${couponValidation.value} off`
                        }
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans */}
        <div className="animate-fade-up [animation-delay:400ms]">
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Plan</CardTitle>
              <CardDescription>Select the plan that best fits your needs</CardDescription>
              
              {/* Billing Period Toggle */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
                <button
                  onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    billingPeriod === "yearly" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      billingPeriod === "yearly" ? "translate-x-8" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className={`text-sm font-medium ${billingPeriod === "yearly" ? "text-foreground" : "text-muted-foreground"}`}>
                  Yearly
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(["free", "pro", "business", "custom"] as const).map((plan) => {
                  const limits = PLAN_LIMITS[plan];
                  const Icon = plan === "custom" ? Mail : planIcons[plan as keyof typeof planIcons];
                  const isCurrentPlan = status?.plan === plan;
                  const isPaidPlan = plan === "pro" || plan === "business";
                  const pricing = isPaidPlan ? calculateFinalPrice(plan, couponValidation, billingPeriod) : null;
                  const isProcessing = selectedPlan === plan && paymentLoading;
                  const periodLabel = billingPeriod === "yearly" ? "/year" : "/month";
                  const usdPrice = isPaidPlan
                    ? billingPeriod === "yearly" ? PLAN_PRICING[plan].usdYearly : PLAN_PRICING[plan].usd
                    : 0;
                  
                  return (
                    <div 
                      key={plan}
                      className={`p-6 rounded-xl border-2 transition-all hover:scale-[1.02] ${
                        isCurrentPlan 
                          ? "border-primary bg-primary/5" 
                          : plan === "pro"
                            ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent"
                            : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          plan === "free" ? "bg-muted" : "gradient-bg"
                        }`}>
                          <Icon className={`w-5 h-5 ${plan === "free" ? "text-muted-foreground" : "text-primary-foreground"}`} />
                        </div>
                        <div>
                          <span className="font-bold capitalize text-lg">{plan}</span>
                          {plan === "pro" && (
                            <Badge variant="secondary" className="ml-2 text-xs">Popular</Badge>
                          )}
                        </div>
                      </div>

                      <div className="mb-4">
                        {plan === "custom" ? (
                          <div className="text-2xl font-bold">Let's Talk</div>
                        ) : plan === "free" ? (
                          <div className="text-2xl font-bold">Free</div>
                        ) : pricing ? (
                          <div className="space-y-1">
                            {pricing.discount > 0 ? (
                              <>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-2xl font-bold text-primary">₹{pricing.final}</span>
                                  <span className="text-sm text-muted-foreground line-through">₹{pricing.original}</span>
                                  <span className="text-xs text-muted-foreground">{periodLabel}</span>
                                </div>
                                <div className="text-xs text-green-600 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  You save ₹{pricing.discount}!
                                </div>
                              </>
                            ) : (
                              <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold">₹{pricing.original}</span>
                                <span className="text-sm text-muted-foreground">{periodLabel}</span>
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                              (${usdPrice} USD)
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <ul className="space-y-2 text-sm mb-6">
                        {plan === "custom" ? (
                          <>
                            {["Unlimited Agents", "Unlimited posts", "Dedicated account manager", "Custom AI training", "API access", "White-label options", "SLA & priority support"].map((feature) => (
                              <li key={feature} className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                {feature}
                              </li>
                            ))}
                          </>
                        ) : (
                          <>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              {limits.agents === -1 ? "Unlimited" : limits.agents} Agent{limits.agents !== 1 ? "s" : ""}
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              {limits.postsPerMonth} posts/month
                            </li>
                            <li className="flex items-center gap-2">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              {limits.postsPerDay} posts/day
                            </li>
                            {limits.aiImageGeneration && (
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                AI Image Generation
                              </li>
                            )}
                            {limits.smartScheduling && (
                              <li className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                                Smart Scheduling
                              </li>
                            )}
                          </>
                        )}
                      </ul>

                      {isCurrentPlan ? (
                        <Badge variant="outline" className="w-full justify-center py-2">
                          Current Plan
                        </Badge>
                      ) : plan === "custom" ? (
                        <Button 
                          className="w-full"
                          variant="outline"
                          asChild
                        >
                          <a href="mailto:contactlinkedbot@gmail.com?subject=Custom Plan Inquiry">
                            <Mail className="w-4 h-4 mr-2" />
                            Contact Us
                          </a>
                        </Button>
                      ) : plan !== "free" ? (
                        <Button 
                          className="w-full"
                          variant={plan === "pro" ? "gradient" : "secondary"}
                          onClick={() => handleUpgrade(plan)}
                          disabled={paymentLoading}
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : pricing?.final === 0 ? (
                            "Activate Free"
                          ) : (
                            `Pay ₹${pricing?.final || (billingPeriod === "yearly" ? PLAN_PRICING[plan as "pro" | "business"].inrYearly : PLAN_PRICING[plan as "pro" | "business"].inr)} →`
                          )}
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Help & Support */}
        <div className="animate-fade-up [animation-delay:450ms]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" />
                Need Help with Payment?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Having trouble with your payment? We're here to help! Reach out to us and we'll get back to you as soon as possible.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" asChild>
                    <a href="mailto:contactlinkedbot@gmail.com?subject=Payment%20Support%20Request">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Support
                    </a>
                  </Button>
                  <Button variant="ghost" asChild>
                    <a href="/resources/help">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Help Center
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Security */}
        <div className="animate-fade-up [animation-delay:500ms]">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  <span>Secure Payment via Razorpay</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>256-bit SSL Encryption</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span>Cancel Anytime</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
