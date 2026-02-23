
-- =============================================
-- Performance indexes for common query patterns
-- =============================================

-- Posts: queried by user_id + status constantly
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON public.posts (user_id, status);

-- Posts: queried by tracking_id for extension sync
CREATE INDEX IF NOT EXISTS idx_posts_tracking_id ON public.posts (tracking_id) WHERE tracking_id IS NOT NULL;

-- Posts: queried by linkedin_post_url for analytics updates
CREATE INDEX IF NOT EXISTS idx_posts_linkedin_url ON public.posts (linkedin_post_url) WHERE linkedin_post_url IS NOT NULL;

-- Post analytics: queried by user_id + post_id (upsert target)
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_analytics_user_post ON public.post_analytics (user_id, post_id);

-- LinkedIn analytics: queried by user_id (upsert target)
CREATE UNIQUE INDEX IF NOT EXISTS idx_linkedin_analytics_user ON public.linkedin_analytics (user_id);

-- User profiles: queried by user_id constantly
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles (user_id);

-- Agents: queried by user_id
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents (user_id);

-- Notifications: queried by user_id + is_read
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (user_id, is_read);

-- Chat messages: queried by user_id + agent_id
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_agent ON public.chat_messages (user_id, agent_id);

-- Post analytics history: queried by post_id
CREATE INDEX IF NOT EXISTS idx_post_analytics_history_post ON public.post_analytics_history (post_id);

-- Extension posted URLs: queried by user_id
CREATE INDEX IF NOT EXISTS idx_extension_posted_urls_user ON public.extension_posted_urls (user_id);
