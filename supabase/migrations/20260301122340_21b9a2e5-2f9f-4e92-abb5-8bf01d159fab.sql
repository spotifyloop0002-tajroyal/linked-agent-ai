
-- Fix ALL RLS policies: Drop RESTRICTIVE and recreate as PERMISSIVE
-- This is needed because RESTRICTIVE-only policies deny all access

-- ============ POSTS ============
DROP POLICY IF EXISTS "Users can view their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can view all posts" ON public.posts;

CREATE POLICY "Users can view their own posts" ON public.posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own posts" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all posts" ON public.posts FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ============ AGENTS ============
DROP POLICY IF EXISTS "Users can view their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can create their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update their own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete their own agents" ON public.agents;
DROP POLICY IF EXISTS "Admins can view all agents" ON public.agents;

CREATE POLICY "Users can view their own agents" ON public.agents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own agents" ON public.agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own agents" ON public.agents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own agents" ON public.agents FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all agents" ON public.agents FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ============ CAMPAIGNS ============
DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can create their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Admins can view all campaigns" ON public.campaigns;

CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own campaigns" ON public.campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all campaigns" ON public.campaigns FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ============ USER_PROFILES ============
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all user profiles" ON public.user_profiles;

CREATE POLICY "Users can view their own profile" ON public.user_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.user_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own profile" ON public.user_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all user profiles" ON public.user_profiles FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- ============ LINKEDIN_ANALYTICS ============
DROP POLICY IF EXISTS "Users can view their own LinkedIn analytics" ON public.linkedin_analytics;
DROP POLICY IF EXISTS "Users can insert their own LinkedIn analytics" ON public.linkedin_analytics;
DROP POLICY IF EXISTS "Users can update their own LinkedIn analytics" ON public.linkedin_analytics;

CREATE POLICY "Users can view their own LinkedIn analytics" ON public.linkedin_analytics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own LinkedIn analytics" ON public.linkedin_analytics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own LinkedIn analytics" ON public.linkedin_analytics FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- ============ CHAT_MESSAGES ============
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON public.chat_messages;

CREATE POLICY "Users can view their own chat messages" ON public.chat_messages FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own chat messages" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own chat messages" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ NOTIFICATIONS ============
DROP POLICY IF EXISTS "Users can view their own or global notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;

CREATE POLICY "Users can view their own or global notifications" ON public.notifications FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR (user_id IS NULL));
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR (auth.uid() = user_id));
CREATE POLICY "Admins can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- ============ EXTENSION_POSTED_URLS ============
DROP POLICY IF EXISTS "Users Insert Own URLs" ON public.extension_posted_urls;
DROP POLICY IF EXISTS "Users View Own URLs" ON public.extension_posted_urls;

CREATE POLICY "Users Insert Own URLs" ON public.extension_posted_urls FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users View Own URLs" ON public.extension_posted_urls FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ USER_WRITING_PROFILES ============
DROP POLICY IF EXISTS "Users can view their own writing profile" ON public.user_writing_profiles;
DROP POLICY IF EXISTS "Users can create their own writing profile" ON public.user_writing_profiles;
DROP POLICY IF EXISTS "Users can update their own writing profile" ON public.user_writing_profiles;
DROP POLICY IF EXISTS "Users can delete their own writing profile" ON public.user_writing_profiles;

CREATE POLICY "Users can view their own writing profile" ON public.user_writing_profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own writing profile" ON public.user_writing_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own writing profile" ON public.user_writing_profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own writing profile" ON public.user_writing_profiles FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ AGENT_REFERENCE_MATERIALS ============
DROP POLICY IF EXISTS "Users can view their own reference materials" ON public.agent_reference_materials;
DROP POLICY IF EXISTS "Users can insert their own reference materials" ON public.agent_reference_materials;
DROP POLICY IF EXISTS "Users can update their own reference materials" ON public.agent_reference_materials;
DROP POLICY IF EXISTS "Users can delete their own reference materials" ON public.agent_reference_materials;

CREATE POLICY "Users can view their own reference materials" ON public.agent_reference_materials FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own reference materials" ON public.agent_reference_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reference materials" ON public.agent_reference_materials FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reference materials" ON public.agent_reference_materials FOR DELETE TO authenticated USING (auth.uid() = user_id);
