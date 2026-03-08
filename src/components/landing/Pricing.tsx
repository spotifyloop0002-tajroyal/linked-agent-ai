import { forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Rocket, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustomPlanDialog from "./CustomPlanDialog";

const plans = [
  {
    name: "Free",
    icon: Zap,
    priceMonthly: "$0",
    priceMonthlyINR: "",
    priceYearly: "$0",
    priceYearlyINR: "",
    period: "forever",
    description: "Perfect for getting started with LinkedIn automation",
    features: [
      "1 Active Agent",
      "5 posts per month",
      "Basic analytics",
      "Photo upload",
      "Community support",
    ],
    cta: "Get Started Free",
    popular: false,
    isCustom: false,
  },
  {
    name: "Pro",
    icon: Crown,
    priceMonthly: "$12",
    priceMonthlyINR: "₹999",
    priceYearly: "$144",
    priceYearlyINR: "₹11,988",
    period: "per month",
    description: "For professionals serious about LinkedIn growth",
    features: [
      "3 Active Agents",
      "30 posts per month",
      "Advanced analytics",
      "AI photo generation",
      "Smart scheduling",
      "Priority support",
      "Custom voice training",
    ],
    cta: "Start Pro Trial",
    popular: true,
    isCustom: false,
  },
  {
    name: "Business",
    icon: Rocket,
    priceMonthly: "$22",
    priceMonthlyINR: "₹1,999",
    priceYearly: "$264",
    priceYearlyINR: "₹23,988",
    period: "per month",
    description: "For teams and agencies managing multiple brands",
    features: [
      "7 Active Agents",
      "60 posts per month",
      "Full analytics suite",
      "AI photo generation",
      "Smart scheduling",
      "Priority support",
      "Custom voice training",
      "A/B testing (coming soon)",
      "Team collaboration",
    ],
    cta: "Start Business Trial",
    popular: false,
    isCustom: false,
  },
  {
    name: "Custom",
    icon: Mail,
    priceMonthly: "",
    priceMonthlyINR: "",
    priceYearly: "",
    priceYearlyINR: "",
    period: "",
    description: "Need more? Let's build a plan that fits your needs",
    features: [
      "Unlimited Agents",
      "Unlimited posts",
      "Dedicated account manager",
      "Custom AI training",
      "API access",
      "White-label options",
      "SLA & priority support",
    ],
    cta: "Contact Us",
    popular: false,
    isCustom: true,
  },
];

export const PLAN_LIMITS = {
  free: { agents: 1, postsPerMonth: 5, postsPerDay: 1 },
  pro: { agents: 3, postsPerMonth: 30, postsPerDay: 2 },
  business: { agents: 7, postsPerMonth: 60, postsPerDay: 3 },
  custom: { agents: 999, postsPerMonth: 9999, postsPerDay: 999 },
};
const Pricing = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  return (
    <section ref={ref} className="py-16 md:py-24 relative overflow-hidden" id="pricing">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
      
      <div className="container relative z-10 px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16 animate-fade-up">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Pricing
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mt-3 md:mt-4 mb-4 md:mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free and scale as you grow. No hidden fees, cancel anytime.
          </p>

          {/* Monthly/Yearly Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                isYearly ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  isYearly ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
              Yearly
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => {
            const priceINR = isYearly ? plan.priceYearlyINR : plan.priceMonthlyINR;
            const priceUSD = isYearly ? plan.priceYearly : plan.priceMonthly;
            const periodLabel = plan.name === "Free" ? plan.period : isYearly ? "per year" : "per month";

            return (
              <div
                key={index}
                className={`relative animate-fade-up ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
                style={{ animationDelay: `${100 + index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-bg text-primary-foreground text-sm font-medium">
                    Most Popular
                  </div>
                )}
                
                <div className={`h-full p-6 md:p-8 rounded-2xl border ${plan.popular ? 'border-primary shadow-glow' : 'border-border shadow-lg'} bg-card flex flex-col`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${plan.popular ? 'gradient-bg' : 'bg-muted'} flex items-center justify-center`}>
                      <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`} />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                    </div>
                  </div>

                  {plan.isCustom ? (
                    <div className="mb-4">
                      <span className="text-4xl font-bold">Let's Talk</span>
                    </div>
                  ) : (
                    <div className="mb-4">
                      {priceINR ? (
                        <>
                          <span className="text-4xl font-bold">{priceINR}</span>
                          <span className="text-muted-foreground ml-2">/{periodLabel}</span>
                          <div className="text-sm text-muted-foreground mt-1">({priceUSD} USD)</div>
                        </>
                      ) : (
                        <>
                          <span className="text-4xl font-bold">{priceUSD}</span>
                          <span className="text-muted-foreground ml-2">/{periodLabel}</span>
                        </>
                      )}
                    </div>
                  )}

                  <p className="text-muted-foreground mb-6">{plan.description}</p>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-success" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.isCustom ? (
                    <CustomPlanDialog />
                  ) : (
                    <Button
                      variant={plan.popular ? "gradient" : "outline"}
                      size="lg"
                      className="w-full"
                      onClick={() => navigate("/login")}
                    >
                      {plan.cta}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Checkout notice */}
        <p className="text-center text-xs text-muted-foreground mt-8 max-w-xl mx-auto">
          By purchasing a plan, you agree to our{" "}
          <a href="/terms" className="text-primary hover:underline">Terms & Conditions</a>{" "}
          and{" "}
          <a href="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</a>.
        </p>
      </div>
    </section>
  );
});

Pricing.displayName = "Pricing";

export default Pricing;
