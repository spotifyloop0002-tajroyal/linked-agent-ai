
-- Create page_views table to track website visits
CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL,
  referrer text,
  user_agent text,
  visitor_id text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to insert page views
CREATE POLICY "Anyone can insert page views"
ON public.page_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can read all page views
CREATE POLICY "Admins can view all page views"
ON public.page_views FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_page_views_created_at ON public.page_views (created_at DESC);
CREATE INDEX idx_page_views_page_path ON public.page_views (page_path);
