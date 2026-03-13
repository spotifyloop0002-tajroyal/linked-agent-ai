import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setUserTimezone } from "@/lib/timezoneUtils";
import { resolveTimezone } from "@/lib/countryTimezones";

/**
 * Hook to sync user timezone on login/profile load.
 * - Sets the timezone in the timezoneUtils module
 * - Auto-detects and saves timezone for old users without one
 */
export function useTimezoneSync(profile: {
  user_id?: string;
  timezone?: string | null;
  browser_detected_timezone?: string | null;
  country?: string | null;
} | null) {
  const syncTimezone = useCallback(async () => {
    if (!profile?.user_id) return;
    
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // If user already has a saved timezone, use it
    if (profile.timezone) {
      setUserTimezone(profile.timezone);
      
      // Update browser_detected_timezone if changed (silent)
      if (profile.browser_detected_timezone !== browserTz) {
        await supabase
          .from("user_profiles")
          .update({ browser_detected_timezone: browserTz })
          .eq("user_id", profile.user_id);
      }
      return;
    }
    
    // No saved timezone — auto-detect from country + browser
    const country = profile.country || "";
    const { timezone } = resolveTimezone(country, browserTz);
    
    setUserTimezone(timezone);
    
    // Save to DB so it persists
    await supabase
      .from("user_profiles")
      .update({
        timezone,
        browser_detected_timezone: browserTz,
      })
      .eq("user_id", profile.user_id);
  }, [profile?.user_id, profile?.timezone, profile?.country, profile?.browser_detected_timezone]);

  useEffect(() => {
    syncTimezone();
  }, [syncTimezone]);
}
