import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLinkedInAPI } from "@/hooks/useLinkedInAPI";
import { DashboardContext } from "@/contexts/DashboardContext";
import { Loader2 } from "lucide-react";

/**
 * DashboardGuard v3: Wraps ALL dashboard routes as a layout route.
 * Auth check + profile fetch + LinkedIn check happens ONCE.
 * Child routes render via <Outlet> — no re-fetching on navigation.
 */
const DashboardGuard = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const profileHook = useUserProfile();
  const linkedInHook = useLinkedInAPI();
  const checkedRef = useRef(false);

  useEffect(() => {
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

        const { data: profile } = await supabase
          .from("user_profiles_safe")
          .select("onboarding_completed, name, user_type")
          .eq("user_id", session.user.id)
          .maybeSingle();

        const isOnboarded = profile?.onboarding_completed || 
          (profile && (profile.name || profile.user_type));

        if (!profile || !isOnboarded) {
          navigate("/onboarding", { replace: true });
          return;
        }

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setAuthorized(false);
        setAuthChecked(false);
        setCurrentUserId(null);
        navigate("/login", { replace: true });
        return;
      }

      if (event === "SIGNED_IN" && session) {
        if (currentUserId && session.user.id !== currentUserId) {
          console.log("🔄 User switch detected, resetting dashboard state");
          setAuthorized(false);
          setAuthChecked(false);
          checkedRef.current = false;
          setCurrentUserId(session.user.id);
          checkAuth();
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [navigate, currentUserId]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...profileHook,
    linkedin: {
      isConnected: linkedInHook.isConnected,
      isLoading: linkedInHook.isLoading,
      linkedinId: linkedInHook.linkedinId,
      tokenExpiry: linkedInHook.tokenExpiry,
      checkConnection: linkedInHook.checkConnection,
      getAuthUrl: linkedInHook.getAuthUrl,
      exchangeToken: linkedInHook.exchangeToken,
      disconnect: linkedInHook.disconnect,
      postToLinkedIn: linkedInHook.postToLinkedIn,
    },
  }), [
    profileHook,
    linkedInHook.isConnected,
    linkedInHook.isLoading,
    linkedInHook.linkedinId,
    linkedInHook.tokenExpiry,
    linkedInHook.checkConnection,
    linkedInHook.getAuthUrl,
    linkedInHook.exchangeToken,
    linkedInHook.disconnect,
    linkedInHook.postToLinkedIn,
  ]);

  if (!authChecked || !authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardContext.Provider value={contextValue}>
      <Outlet />
    </DashboardContext.Provider>
  );
};

export default DashboardGuard;
