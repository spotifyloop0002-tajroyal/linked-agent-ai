
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS content_length text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS emoji_level text DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS hashtag_mode text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS fixed_hashtags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS image_option text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS posting_time text DEFAULT '09:00';
