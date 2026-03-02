import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface AnalyticsProfile {
  id: string;
  user_id: string;
  username: string | null;
  profile_url: string | null;
  followers_count: number;
  connections_count: number;
  total_posts: number;
  last_synced: string | null;
}

interface PostAnalytics {
  id: string;
  user_id: string;
  post_id: string;
  content_preview: string | null;
  linkedin_url: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  post_timestamp: string | null;
  scraped_at: string | null;
}

export interface DashboardAgent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  is_active: boolean;
  posts_created: number;
  posts_scheduled: number;
  posts_published: number;
  success_rate: number;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface DashboardScheduledPost {
  id: string;
  content: string;
  scheduled_time: string;
  status: string;
  posted_at?: string;
  linkedin_post_url?: string;
  verified?: boolean;
  tracking_id?: string;
  views_count?: number;
  likes_count?: number;
  comments_count?: number;
  shares_count?: number;
  last_synced_at?: string;
  agent_name?: string | null;
  campaign_id?: string | null;
}

interface DashboardData {
  analyticsProfile: AnalyticsProfile | null;
  analyticsPosts: PostAnalytics[];
  agents: DashboardAgent[];
  scheduledPosts: DashboardScheduledPost[];
  lastSync: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setScheduledPosts: React.Dispatch<React.SetStateAction<DashboardScheduledPost[]>>;
}

export const useDashboardData = (): DashboardData => {
  const [analyticsProfile, setAnalyticsProfile] = useState<AnalyticsProfile | null>(null);
  const [analyticsPosts, setAnalyticsPosts] = useState<PostAnalytics[]>([]);
  const [agents, setAgents] = useState<DashboardAgent[]>([]);
  const [scheduledPosts, setScheduledPosts] = useState<DashboardScheduledPost[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const response = await supabase.functions.invoke('dashboard-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.success) {
        setAnalyticsProfile(data.analytics?.profile || null);
        setAnalyticsPosts(data.analytics?.posts || []);
        setAgents(data.agents || []);
        setScheduledPosts(data.scheduledPosts || []);
        setLastSync(data.lastSync);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Window focus refetch removed — QueryClient already has refetchOnWindowFocus: false
  // and the dashboard-data edge function is expensive. Users can pull-to-refresh manually.

  return {
    analyticsProfile,
    analyticsPosts,
    agents,
    scheduledPosts,
    lastSync,
    isLoading,
    error,
    refetch: fetchAll,
    setScheduledPosts,
  };
};
