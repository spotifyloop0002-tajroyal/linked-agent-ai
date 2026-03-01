
DROP FUNCTION IF EXISTS public.get_admin_users_data();

CREATE FUNCTION public.get_admin_users_data()
 RETURNS TABLE(
   id uuid, user_id uuid, email text, name text, phone_number text,
   linkedin_profile_url text, city text, country text, role text,
   company_name text, industry text, subscription_plan text,
   subscription_expires_at timestamp with time zone,
   posts_created_count bigint, posts_scheduled_count bigint,
   posts_published_count bigint, followers_count bigint,
   created_at timestamp with time zone, last_active_at timestamp with time zone,
   onboarding_completed boolean,
   user_type text, background text, company_description text,
   target_audience text, location text, default_topics text[],
   posting_goals text[], preferred_tone text, post_frequency text,
   linkedin_username text, linkedin_verified boolean,
   linkedin_profile_confirmed boolean, linkedin_id text
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    up.id,
    up.user_id,
    up.email,
    up.name,
    up.phone_number,
    up.linkedin_profile_url,
    up.city,
    up.country,
    up.role,
    up.company_name,
    up.industry,
    up.subscription_plan,
    up.subscription_expires_at,
    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = up.user_id), 0) as posts_created_count,
    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = up.user_id AND p.status = 'pending'), 0) as posts_scheduled_count,
    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = up.user_id AND p.status = 'posted'), 0) as posts_published_count,
    COALESCE((SELECT la.followers_count FROM linkedin_analytics la WHERE la.user_id = up.user_id LIMIT 1), 0)::bigint as followers_count,
    up.created_at,
    up.last_active_at,
    COALESCE(up.onboarding_completed, false) as onboarding_completed,
    up.user_type,
    up.background,
    up.company_description,
    up.target_audience,
    up.location,
    up.default_topics,
    up.posting_goals,
    up.preferred_tone,
    up.post_frequency,
    up.linkedin_username,
    COALESCE(up.linkedin_verified, false) as linkedin_verified,
    COALESCE(up.linkedin_profile_confirmed, false) as linkedin_profile_confirmed,
    up.linkedin_id
  FROM user_profiles up
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = up.user_id 
    AND ur.role IN ('admin', 'super_admin')
  );
$function$;
