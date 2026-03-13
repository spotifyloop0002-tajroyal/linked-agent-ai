
ALTER TABLE public.user_profiles
  ADD COLUMN timezone text DEFAULT NULL,
  ADD COLUMN browser_detected_timezone text DEFAULT NULL;
