
-- Add posts_per_day column to campaigns table
ALTER TABLE public.campaigns ADD COLUMN posts_per_day integer NOT NULL DEFAULT 1;
