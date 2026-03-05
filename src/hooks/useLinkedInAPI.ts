import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface LinkedInConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  linkedinId: string | null;
  tokenExpiry: string | null;
}

export function useLinkedInAPI() {
  const [state, setState] = useState<LinkedInConnectionState>({
    isConnected: false,
    isLoading: true,
    linkedinId: null,
    tokenExpiry: null,
  });

  const checkConnection = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ isConnected: false, isLoading: false, linkedinId: null, tokenExpiry: null });
        return;
      }

      const { data, error } = await supabase.functions.invoke("linkedin-auth", {
        body: { action: "check_connection" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setState({
        isConnected: data.connected,
        isLoading: false,
        linkedinId: data.linkedinId,
        tokenExpiry: data.tokenExpiry,
      });
    } catch (err) {
      console.error("Failed to check LinkedIn connection:", err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Defer connection check to avoid blocking initial dashboard render
  useEffect(() => {
    // Small delay to let the dashboard render first, then check LinkedIn connection
    const timer = setTimeout(() => checkConnection(), 1500);
    return () => clearTimeout(timer);
  }, [checkConnection]);

  const getAuthUrl = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const redirectUri = `${window.location.origin}/auth/linkedin/callback`;

      const { data, error } = await supabase.functions.invoke("linkedin-auth", {
        body: { action: "get_auth_url", redirectUri },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      
      // Save state for CSRF verification
      if (data.state) {
        sessionStorage.setItem("linkedin_oauth_state", data.state);
      }

      return data.authUrl;
    } catch (err) {
      console.error("Failed to get auth URL:", err);
      return null;
    }
  }, []);

  const exchangeToken = useCallback(async (code: string): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const redirectUri = `${window.location.origin}/auth/linkedin/callback`;

      const { data, error } = await supabase.functions.invoke("linkedin-auth", {
        body: { action: "exchange_token", code, redirectUri },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data.success) {
        setState({
          isConnected: true,
          isLoading: false,
          linkedinId: data.profile?.linkedinId || null,
          tokenExpiry: null,
        });
        return true;
      }

      return false;
    } catch (err) {
      console.error("Token exchange failed:", err);
      return false;
    }
  }, []);

  const disconnect = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return false;

      const { error } = await supabase.functions.invoke("linkedin-auth", {
        body: { action: "disconnect" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      setState({
        isConnected: false,
        isLoading: false,
        linkedinId: null,
        tokenExpiry: null,
      });

      return true;
    } catch (err) {
      console.error("Disconnect failed:", err);
      return false;
    }
  }, []);

  const postToLinkedIn = useCallback(async (postId: string, content: string, imageUrl?: string): Promise<{
    success: boolean;
    postUrl?: string;
    error?: string;
  }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: "Not authenticated" };

      const { data, error } = await supabase.functions.invoke("linkedin-post", {
        body: { postId, content, imageUrl },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;

      if (data.success) {
        return { success: true, postUrl: data.postUrl };
      }

      return { success: false, error: data.error || "Failed to post" };
    } catch (err) {
      console.error("Post to LinkedIn failed:", err);
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  }, []);

  return {
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    linkedinId: state.linkedinId,
    tokenExpiry: state.tokenExpiry,
    checkConnection,
    getAuthUrl,
    exchangeToken,
    disconnect,
    postToLinkedIn,
  };
}
