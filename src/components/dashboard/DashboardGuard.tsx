import { useState, useEffect, useRef } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DashboardContext } from "@/contexts/DashboardContext";
import { Loader2 } from "lucide-react";

/**
 * DashboardGuard v2: Wraps ALL dashboard routes as a layout route.
 * Auth check + profile fetch happens ONCE. Child routes render via <Outlet>.
 * Navigating between dashboard pages does NOT re-run auth or profile loading.
 */
const DashboardGuard = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const profileHook = useUserProfile();
  const checkedRef = useRef(false);

  useEffect(() => {
    // Prevent double-check in StrictMode
    if (checkedRef.current) return;
    checkedRef.current = true;

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
          .select("onboarding_completed, name, user_type")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // Old users may not have onboarding_completed set — treat them as onboarded
        // if they have basic profile data (name or user_type)
        const isOnboarded = profile?.onboarding_completed || 
          (profile && (profile.name || profile.user_type));

        if (!profile || !isOnboarded) {
          navigate("/onboarding", { replace: true });
          return;
        }

        // Backfill onboarding_completed for old users
        if (!profile.onboarding_completed && isOnboarded) {
          supabase
            .from("user_profiles")
            .update({ onboarding_completed: true })
            .eq("user_id", session.user.id)
            .then(() => console.log("✅ Backfilled onboarding_completed for old user"));
        }

        if (!cancelled) {
          setCurrentUserId(session.user.id);
          setAuthorized(true);
          setAuthChecked(true);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
        navigate("/login", { replace: true });
      }
    };

    checkAuth();

    // Listen for auth changes — handle sign out AND user switch
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        // Clear all cached state to prevent data leakage
        setAuthorized(false);
        setAuthChecked(false);
        setCurrentUserId(null);
        navigate("/login", { replace: true });
        return;
      }

      // Handle user switch (different user signed in)
      if (event === "SIGNED_IN" && session) {
        if (currentUserId && session.user.id !== currentUserId) {
          console.log("🔄 User switch detected, resetting dashboard state");
          setAuthorized(false);
          setAuthChecked(false);
          checkedRef.current = false;
          setCurrentUserId(session.user.id);
          // Re-run auth check for new user
          checkAuth();
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, currentUserId]);

  if (!authChecked || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={profileHook}>
      <Outlet />
    </DashboardContext.Provider>
  );
};

export default DashboardGuard;
