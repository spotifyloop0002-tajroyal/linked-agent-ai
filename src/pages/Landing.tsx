import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import { supabase } from "@/integrations/supabase/client";

// Lazy load below-the-fold sections
const Features = lazy(() => import("@/components/landing/Features"));
const Pricing = lazy(() => import("@/components/landing/Pricing"));
const AffiliateSection = lazy(() => import("@/components/landing/AffiliateSection"));
const Footer = lazy(() => import("@/components/landing/Footer"));

const Landing = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // Single auth check — redirect logged-in users to dashboard
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        await supabase.auth.signOut();
      }
      setIsLoggedIn(!!user);
      if (user) {
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
      <Navbar isLoggedIn={isLoggedIn} />
      <main>
        <Hero isLoggedIn={isLoggedIn} />
        <Suspense fallback={<div className="h-96" />}>
          <Features />
          <Pricing />
          <AffiliateSection />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default Landing;
