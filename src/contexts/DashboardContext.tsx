import { createContext, useContext } from "react";
import type { UserProfile } from "@/hooks/useUserProfile";

interface DashboardContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  saveProfile: (data: any) => Promise<boolean>;
  completeOnboarding: (data: any) => Promise<boolean>;
  updateLastActive: () => Promise<void>;
  incrementPostCount: (type: 'created' | 'scheduled' | 'published') => Promise<void>;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export const useDashboardProfile = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardProfile must be used within DashboardGuard");
  }
  return ctx;
};
