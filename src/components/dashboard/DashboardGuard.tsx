import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLinkedInAPI } from "@/hooks/useLinkedInAPI";
import { DashboardContext } from "@/contexts/DashboardContext";
import { startAnalyticsCron, stopAnalyticsCron } from "@/lib/analytics-cron";
import { Loader2 } from "lucide-react";

/**
 * DashboardGuard v4: Single auth + profile fetch.
 * useUserProfile already fetches the full profile on mount.
 * We reuse its data for the onboarding check instead of making a separate query.
 */
const DashboardGuard = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const profileHook = useUserProfile();
  const linkedInHook = useLinkedInAPI();
  const checkedRef = useRef(false);

  // Wait for profileHook to finish loading, then decide routing
  useEffect(() => {
    if (checkedRef.current) return;

    // Profile hook is still loading — wait
    if (profileHook.isLoading) return;

    // Profile hook has finished — check auth
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        checkedRef.current = true;
        navigate("/login", { replace: true });
        return;
      }

      let profile = profileHook.profile;

      // If profile is null but user is authenticated, fetch directly
      // This handles the race condition where session restores after initial profile fetch
      if (!profile) {
        console.log("⏳ Profile null after hook load, fetching directly...");
        const { data } = await supabase
          .from("user_profiles_safe")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle();
        profile = data as any;
      }

      const isOnboarded = profile?.onboarding_completed ||
        (profile && (profile.name || profile.user_type));

      if (!profile || !isOnboarded) {
        checkedRef.current = true;
        navigate("/onboarding", { replace: true });
        return;
      }

      // Backfill onboarding flag for old users
      if (!profile.onboarding_completed && isOnboarded) {
        supabase
          .from("user_profiles")
          .update({ onboarding_completed: true })
          .eq("user_id", session.user.id)
          .then(() => console.log("✅ Backfilled onboarding_completed for old user"));
      }

      checkedRef.current = true;
      setCurrentUserId(session.user.id);
      setAuthorized(true);
      setAuthChecked(true);

      // Start analytics cron only when dashboard is active
      startAnalyticsCron();
    };

    checkAuth();
  }, [profileHook.isLoading, profileHook.profile, navigate]);

  // Handle auth state changes (sign out, user switch)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setAuthorized(false);
        setAuthChecked(false);
        setCurrentUserId(null);
        checkedRef.current = false;
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
          profileHook.fetchProfile();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, currentUserId, profileHook.fetchProfile]);

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
