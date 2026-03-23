import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile, type UserProfile } from "@/hooks/useUserProfile";
import { useLinkedInAPI } from "@/hooks/useLinkedInAPI";
import { DashboardContext } from "@/contexts/DashboardContext";
import { useTimezoneSync } from "@/hooks/useTimezoneSync";
import { SupportChatLauncher } from "@/components/support/SupportChatLauncher";
import { Loader2 } from "lucide-react";

/**
 * DashboardGuard v5: Optimized context stability.
 * - Uses individual field deps instead of whole profileHook object
 * - Defers non-critical operations
 */
const DashboardGuard = () => {
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [resolvedProfile, setResolvedProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const profileHook = useUserProfile();
  const linkedInHook = useLinkedInAPI();
  const checkedRef = useRef(false);
  
  useTimezoneSync(profileHook.profile ?? resolvedProfile);

  useEffect(() => {
    if (profileHook.profile) {
      setResolvedProfile(profileHook.profile);
    }
  }, [profileHook.profile]);

  useEffect(() => {
    if (checkedRef.current) return;
    if (profileHook.isLoading) return;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          checkedRef.current = true;
          navigate("/login", { replace: true });
          return;
        }

        supabase.auth.getUser().then(({ error: userError }) => {
          if (userError) {
            console.warn("⚠️ User no longer exists, signing out:", userError.message);
            supabase.auth.signOut();
            navigate("/login", { replace: true });
          }
        });

        let profile = profileHook.profile;

        if (!profile) {
          console.log("⏳ Profile missing in hook, fetching directly...");
          const { data } = await supabase
            .from("user_profiles_safe")
            .select("*")
            .eq("user_id", session.user.id)
            .maybeSingle();
          profile = (data as UserProfile | null) ?? null;
        }

        setResolvedProfile(profile ?? null);

        const isOnboarded = Boolean(
          profile?.onboarding_completed || (profile && (profile.name || profile.user_type))
        );

        if (!profile || !isOnboarded) {
          checkedRef.current = true;
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

        checkedRef.current = true;
        setCurrentUserId(session.user.id);
        setAuthorized(true);
        setAuthChecked(true);

      } catch (err) {
        console.error("❌ Auth check failed:", err);
        checkedRef.current = true;
        navigate("/login", { replace: true });
      }
    };

    checkAuth();
  }, [profileHook.isLoading, profileHook.profile, navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setAuthorized(false);
        setAuthChecked(false);
        setCurrentUserId(null);
        setResolvedProfile(null);
        checkedRef.current = false;
        navigate("/login", { replace: true });
        return;
      }

      if (event === "SIGNED_IN" && session) {
        if (currentUserId && session.user.id !== currentUserId) {
          console.log("🔄 User switch detected, resetting dashboard state");
          setAuthorized(false);
          setAuthChecked(false);
          setResolvedProfile(null);
          checkedRef.current = false;
          setCurrentUserId(session.user.id);
          profileHook.fetchProfile();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, currentUserId, profileHook.fetchProfile]);

  const contextValue = useMemo(() => ({
    profile: profileHook.profile ?? resolvedProfile,
    isLoading: profileHook.isLoading,
    error: profileHook.error,
    fetchProfile: profileHook.fetchProfile,
    saveProfile: profileHook.saveProfile,
    completeOnboarding: profileHook.completeOnboarding,
    updateLastActive: profileHook.updateLastActive,
    incrementPostCount: profileHook.incrementPostCount,
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
    profileHook.profile,
    resolvedProfile,
    profileHook.isLoading,
    profileHook.error,
    profileHook.fetchProfile,
    profileHook.saveProfile,
    profileHook.completeOnboarding,
    profileHook.updateLastActive,
    profileHook.incrementPostCount,
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
      <SupportChatLauncher />
    </DashboardContext.Provider>
  );
};

export default DashboardGuard;