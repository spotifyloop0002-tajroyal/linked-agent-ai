import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DashboardContext } from "@/contexts/DashboardContext";
import { Loader2 } from "lucide-react";

interface DashboardGuardProps {
  children: React.ReactNode;
}

const DashboardGuard = ({ children }: DashboardGuardProps) => {
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const profileHook = useUserProfile();

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate("/login", { replace: true });
          return;
        }

        // Check onboarding status
        const { data: profile } = await supabase
          .from("user_profiles_safe")
          .select("onboarding_completed")
          .eq("user_id", session.user.id)
          .maybeSingle();

        if (!profile?.onboarding_completed) {
          navigate("/onboarding", { replace: true });
          return;
        }

        if (!cancelled) {
          setAuthorized(true);
          setAuthChecked(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        navigate("/login", { replace: true });
      }
    };

    checkAuth();

    // Listen for sign out
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (!authChecked || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={profileHook}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardGuard;
