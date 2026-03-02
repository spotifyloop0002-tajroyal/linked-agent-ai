import { createContext, useContext } from "react";
import type { UserProfile } from "@/hooks/useUserProfile";

interface LinkedInState {
  isConnected: boolean;
  isLoading: boolean;
  linkedinId: string | null;
  tokenExpiry: string | null;
  checkConnection: () => Promise<void>;
  getAuthUrl: () => Promise<string | null>;
  exchangeToken: (code: string) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
  postToLinkedIn: (postId: string, content: string, imageUrl?: string) => Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }>;
}

interface DashboardContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfile: () => Promise<void>;
  saveProfile: (data: any) => Promise<boolean>;
  completeOnboarding: (data: any) => Promise<boolean>;
  updateLastActive: () => Promise<void>;
  incrementPostCount: (type: 'created' | 'scheduled' | 'published') => Promise<void>;
  // LinkedIn connection state — shared across all dashboard pages
  linkedin: LinkedInState;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export const useDashboardProfile = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardProfile must be used within DashboardGuard");
  }
  return ctx;
};

/** Convenience hook to access LinkedIn state from DashboardContext */
export const useDashboardLinkedIn = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboardLinkedIn must be used within DashboardGuard");
  }
  return ctx.linkedin;
};
