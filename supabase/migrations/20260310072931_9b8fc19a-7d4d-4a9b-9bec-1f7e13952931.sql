ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS agent_type text DEFAULT 'professional';
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS posting_days text[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS campaign_name text DEFAULT '';