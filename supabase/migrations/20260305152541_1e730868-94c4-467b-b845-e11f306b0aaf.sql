
-- Performance indexes for common queries
-- Posts by user_id + status (used by dashboard, calendar, analytics)
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON public.posts (user_id, status);

-- Posts by user_id + scheduled_time (used for calendar and scheduling)
CREATE INDEX IF NOT EXISTS idx_posts_user_scheduled ON public.posts (user_id, scheduled_time DESC NULLS LAST);

-- Posts by user_id + posted_at (used for analytics)
CREATE INDEX IF NOT EXISTS idx_posts_user_posted ON public.posts (user_id, posted_at DESC NULLS LAST) WHERE status = 'posted';

-- Posts by linkedin_post_url (used for analytics update matching)
CREATE INDEX IF NOT EXISTS idx_posts_linkedin_url ON public.posts (linkedin_post_url) WHERE linkedin_post_url IS NOT NULL;

-- Agents by user_id (used on dashboard and agents page)
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents (user_id);

-- Campaigns by user_id (used on campaigns page)
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns (user_id);

-- Chat messages by user_id + agent_id (used for agent chat history)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_agent ON public.chat_messages (user_id, agent_id, created_at DESC);

-- Notifications by user_id + is_read (used by notification bell)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read) WHERE is_read = false;

-- Page views by created_at (used by admin visitors page)
CREATE INDEX IF NOT EXISTS idx_page_views_created ON public.page_views (created_at DESC);

-- User profiles by user_id (primary lookup)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles (user_id);

-- Post analytics by user_id (used on analytics page)
CREATE INDEX IF NOT EXISTS idx_post_analytics_user ON public.post_analytics (user_id);
