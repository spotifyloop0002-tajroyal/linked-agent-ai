import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Rocket } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Free",
    icon: Zap,
    price: "$0",
    priceINR: "",
    period: "forever",
    description: "Perfect for getting started with LinkedIn automation",
    features: [
      "1 Active Agent",
      "5 posts per month",
      "Basic analytics",
      "Photo upload",
      "Community support",
    ],
    limits: {
      agents: 1,
      postsPerMonth: 5,
      postsPerDay: 1,
    },
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    icon: Crown,
    price: "$12",
    priceINR: "₹999",
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
    limits: {
      agents: 3,
      postsPerMonth: 30,
      postsPerDay: 2,
    },
    cta: "Start Pro Trial",
    popular: true,
  },
  {
    name: "Business",
    icon: Rocket,
    price: "$22",
    priceINR: "₹1999",
    period: "per month",
    description: "For teams and agencies managing multiple brands",
    features: [
      "Unlimited Agents",
      "60 posts per month",
      "Full analytics suite",
      "AI photo generation",
      "Smart scheduling",
      "Priority support",
      "Custom voice training",
      "A/B testing (coming soon)",
      "Team collaboration",
    ],
    limits: {
      agents: -1,
      postsPerMonth: 60,
      postsPerDay: 3,
    },
    cta: "Start Business Trial",
    popular: false,
  },
];

export const PLAN_LIMITS = {
  free: { agents: 1, postsPerMonth: 5, postsPerDay: 1 },
  pro: { agents: 3, postsPerMonth: 30, postsPerDay: 2 },
  business: { agents: -1, postsPerMonth: 60, postsPerDay: 3 },
};

const Pricing = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();

  return (
    <section ref={ref} className="py-16 md:py-24 relative overflow-hidden" id="pricing">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-background to-background" />
      
      <div className="container relative z-10 px-4">
        {/* Section header */}
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
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
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
                {/* Plan header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${plan.popular ? 'gradient-bg' : 'bg-muted'} flex items-center justify-center`}>
                    <plan.icon className={`w-6 h-6 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{plan.name}</h3>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-4">
                  {plan.priceINR ? (
                    <>
                      <span className="text-4xl font-bold">{plan.priceINR}</span>
                      <span className="text-muted-foreground ml-2">/{plan.period}</span>
                      <div className="text-sm text-muted-foreground mt-1">({plan.price} USD)</div>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground ml-2">/{plan.period}</span>
                    </>
                  )}
                </div>

                <p className="text-muted-foreground mb-6">{plan.description}</p>

                {/* Features */}
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

                {/* CTA */}
                <Button
                  variant={plan.popular ? "gradient" : "outline"}
                  size="lg"
                  className="w-full"
                  onClick={() => navigate("/login")}
                >
                  {plan.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

Pricing.displayName = "Pricing";

export default Pricing;
