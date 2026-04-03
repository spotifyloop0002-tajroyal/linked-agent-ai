import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { faqJsonLd } from "@/components/landing/FAQSection";

// Lazy load below-the-fold sections
const Features = lazy(() => import("@/components/landing/Features"));
const Pricing = lazy(() => import("@/components/landing/Pricing"));
const FAQSection = lazy(() => import("@/components/landing/FAQSection"));
const AffiliateSection = lazy(() => import("@/components/landing/AffiliateSection"));
const Footer = lazy(() => import("@/components/landing/Footer"));
const InstallPopup = lazy(() => import("@/components/landing/InstallPopup"));

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "LinkedBot",
  url: "https://www.linkedbot.online",
  logo: "https://www.linkedbot.online/linkedbot-icon.png",
  sameAs: [],
  contactPoint: {
    "@type": "ContactPoint",
    email: "team@linkedbot.online",
    contactType: "customer support",
  },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LinkedBot",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://www.linkedbot.online",
  description:
    "AI-powered LinkedIn automation tool for content creation, scheduling, and publishing. Save 10+ hours/week and get 3× more engagement.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free trial available",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "150",
    bestRating: "5",
  },
};

const Landing = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="LinkedBot – AI LinkedIn Post Generator & Automation Tool"
        description="LinkedBot helps you generate, schedule, and automate LinkedIn posts using AI agents. Build your personal brand faster. Try LinkedBot free."
        canonical="https://www.linkedbot.online/"
        keywords="LinkedBot, AI LinkedIn tool, LinkedIn post generator, LinkedIn automation, personal branding tool, LinkedIn scheduler, LinkedIn content creator, automate LinkedIn posts, LinkedIn marketing tool"
        jsonLd={[organizationJsonLd, softwareJsonLd, faqJsonLd]}
      />
      <Navbar isLoggedIn={isLoggedIn} />
      <main>
        <Hero isLoggedIn={isLoggedIn} />
        <Suspense fallback={<div className="h-96" />}>
          <Features />
          <Pricing />
          <FAQSection />
          <AffiliateSection />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
      <Suspense fallback={null}>
        <InstallPopup />
      </Suspense>
    </div>
  );
};

export default Landing;
