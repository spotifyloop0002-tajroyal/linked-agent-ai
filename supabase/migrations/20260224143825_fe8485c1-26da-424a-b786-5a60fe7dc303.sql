
-- ============================================================
-- Smart Campaign Mode - Database Schema
-- ============================================================

-- 1. Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  topic TEXT NOT NULL,
  tone_type TEXT DEFAULT 'auto',
  duration_type TEXT NOT NULL DEFAULT '7_days', -- '7_days' | 'alternate' | 'custom'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  post_count INTEGER NOT NULL DEFAULT 7,
  research_mode BOOLEAN DEFAULT false,
  auto_best_time BOOLEAN DEFAULT true,
  auto_approve BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | generating | active | paused | completed | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all campaigns" ON public.campaigns FOR SELECT USING (is_admin(auth.uid()));

-- 2. Add campaign_id to existing posts table
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_posts_campaign_id ON public.posts(campaign_id);

-- 3. User Writing DNA profiles (extends existing user_writing_style)
CREATE TABLE public.user_writing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tone_type TEXT DEFAULT 'auto', -- storyteller | analyst | creator | motivator | educator | auto
  avg_post_length INTEGER DEFAULT 180,
  uses_emojis BOOLEAN DEFAULT true,
  emoji_frequency TEXT DEFAULT 'moderate', -- none | low | moderate | heavy
  hook_style TEXT DEFAULT 'question', -- question | bold_statement | story_opener | data_lead
  avg_sentence_length TEXT DEFAULT 'medium', -- short | medium | long
  uses_bullet_points BOOLEAN DEFAULT false,
  uses_numbered_lists BOOLEAN DEFAULT false,
  signature_phrases TEXT[] DEFAULT '{}',
  topics_history TEXT[] DEFAULT '{}',
  sample_posts JSONB DEFAULT '[]'::jsonb,
  voice_tags JSONB DEFAULT '{}'::jsonb, -- extensible for future voice-to-post
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_writing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own writing profile" ON public.user_writing_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own writing profile" ON public.user_writing_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own writing profile" ON public.user_writing_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own writing profile" ON public.user_writing_profiles FOR DELETE USING (auth.uid() = user_id);

-- 4. Notification log
CREATE TABLE public.notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'in_app', -- email | in_app
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications log" ON public.notification_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage notification log" ON public.notification_log FOR ALL USING (auth.role() = 'service_role');

-- 5. Voice notes (future-ready)
CREATE TABLE public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  transcript TEXT,
  generated_post TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | processed | posted
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own voice notes" ON public.voice_notes FOR ALL USING (auth.uid() = user_id);

-- 6. Notification preferences in user_profiles (add columns)
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS notify_before_post BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_daily_digest BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_campaign_complete BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_hours_before INTEGER DEFAULT 2;

-- 7. Enable realtime for campaigns
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;

-- 8. Updated_at triggers
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_writing_profiles_updated_at BEFORE UPDATE ON public.user_writing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_voice_notes_updated_at BEFORE UPDATE ON public.voice_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_user_status ON public.campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON public.notification_log(user_id, created_at DESC);
