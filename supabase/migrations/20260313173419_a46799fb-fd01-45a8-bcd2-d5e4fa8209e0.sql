
DROP VIEW IF EXISTS public.user_profiles_safe;
CREATE VIEW public.user_profiles_safe AS
SELECT
  id, user_id, name, email, user_type, company_name, industry,
  company_description, target_audience, location, default_topics,
  role, background, posting_goals, linkedin_profile_url,
  linkedin_profile_url_locked, linkedin_profile_edit_count,
  linkedin_profile_confirmed, linkedin_username, linkedin_public_id,
  linkedin_verified, linkedin_verified_at, linkedin_id,
  preferred_tone, post_frequency, onboarding_completed,
  phone_number, city, country, subscription_plan,
  subscription_expires_at, posts_created_count, posts_scheduled_count,
  posts_published_count, last_active_at, created_at, updated_at,
  linkedin_profile_data, profile_last_scraped, daily_post_count,
  last_post_date, timezone, browser_detected_timezone
FROM public.user_profiles;
