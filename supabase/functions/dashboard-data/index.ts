import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;

    // Run ALL queries in parallel — this is the key optimization
    const [analyticsResult, postsResult, agentsResult, scheduledPostsResult] = await Promise.all([
      // 1. Profile analytics
      supabase
        .from('linkedin_analytics')
        .select('id, user_id, username, profile_url, followers_count, connections_count, total_posts, last_synced')
        .eq('user_id', userId)
        .maybeSingle(),

      // 2. Posted posts with analytics (for stats)
      supabase
        .from('posts')
        .select('id, content, linkedin_post_url, views_count, likes_count, comments_count, shares_count, last_synced_at, posted_at, status')
        .eq('user_id', userId)
        .eq('status', 'posted')
        .not('linkedin_post_url', 'is', null)
        .order('posted_at', { ascending: false })
        .limit(50),

      // 3. Agents
      supabase
        .from('agents')
        .select('id, user_id, name, type, is_active, posts_created, posts_scheduled, posts_published, success_rate, settings, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      // 4. Scheduled/recent posts for the dashboard table
      supabase
        .from('posts')
        .select('id, content, scheduled_time, status, posted_at, linkedin_post_url, verified, tracking_id, photo_url, views_count, likes_count, comments_count, shares_count, last_synced_at, agent_name, campaign_id')
        .eq('user_id', userId)
        .in('status', ['pending', 'posting', 'posted', 'failed'])
        .order('scheduled_time', { ascending: true })
        .limit(20),
    ]);

    // Transform analytics posts
    const analyticsPosts = (postsResult.data || []).map(post => ({
      id: post.id,
      user_id: userId,
      post_id: post.id,
      content_preview: post.content?.substring(0, 200) || null,
      linkedin_url: post.linkedin_post_url,
      views: post.views_count || 0,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      shares: post.shares_count || 0,
      post_timestamp: post.posted_at,
      scraped_at: post.last_synced_at,
    }));

    const lastSyncTime = analyticsPosts.length > 0 && analyticsPosts[0].scraped_at
      ? analyticsPosts[0].scraped_at
      : analyticsResult.data?.last_synced || null;

    return new Response(JSON.stringify({
      success: true,
      analytics: {
        profile: analyticsResult.data || null,
        posts: analyticsPosts,
      },
      agents: agentsResult.data || [],
      scheduledPosts: scheduledPostsResult.data || [],
      lastSync: lastSyncTime,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('❌ Dashboard data fetch error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch dashboard data',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
