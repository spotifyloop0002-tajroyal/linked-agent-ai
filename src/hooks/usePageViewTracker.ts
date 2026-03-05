import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Generate a stable visitor ID per browser session
const getVisitorId = (): string => {
  let id = sessionStorage.getItem("visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("visitor_id", id);
  }
  return id;
};

export const usePageViewTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const track = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        await supabase.from("page_views" as any).insert({
          page_path: location.pathname,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          visitor_id: getVisitorId(),
          user_id: session?.user?.id || null,
        });
      } catch {
        // Silently fail — tracking should never break the app
      }
    };

    track();
  }, [location.pathname]);
};
