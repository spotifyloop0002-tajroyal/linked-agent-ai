
CREATE TABLE public.research_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash text NOT NULL,
  query_text text NOT NULL,
  insights text NOT NULL,
  suggested_topics text[] DEFAULT '{}',
  source_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for fast lookup by hash
CREATE INDEX idx_research_cache_query_hash ON public.research_cache (query_hash);

-- Index for cleanup of expired entries
CREATE INDEX idx_research_cache_expires_at ON public.research_cache (expires_at);

-- RLS: Only service role can access (edge functions use service role)
ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages research cache"
  ON public.research_cache
  FOR ALL
  USING (auth.role() = 'service_role'::text);
