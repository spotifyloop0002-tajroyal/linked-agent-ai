
-- Add UNIQUE constraint on linkedin_id to prevent cross-mapping
-- First, clean up any duplicates (keep the most recently updated one)
DELETE FROM user_profiles a
USING user_profiles b
WHERE a.linkedin_id IS NOT NULL
  AND a.linkedin_id = b.linkedin_id
  AND a.user_id != b.user_id
  AND a.updated_at < b.updated_at;

-- Now add the unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_linkedin_id_unique 
ON user_profiles (linkedin_id) 
WHERE linkedin_id IS NOT NULL;
