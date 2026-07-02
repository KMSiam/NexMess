-- 1. Add deleted_at column to public.profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Drop the foreign key from profiles to auth.users if it exists so deleting auth.users doesn't delete the profile
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Configure pg_cron scheduler job to run daily at midnight
-- This job will:
--   a) Delete the user from auth.users (permanent login removal)
--   b) Scrub personal data from profiles but KEEP the row so history (meals, deposits) is preserved
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-deleted-users') THEN
    PERFORM cron.unschedule('purge-deleted-users');
  END IF;
END
$$;

-- Schedule job
SELECT cron.schedule(
  'purge-deleted-users',
  '0 0 * * *',
  $$
  WITH deleted_candidates AS (
    SELECT id FROM public.profiles 
    WHERE deleted_at IS NOT NULL AND deleted_at < NOW() - INTERVAL '30 days'
  ),
  -- Scrub personal data from profiles
  scrubbed_profiles AS (
    UPDATE public.profiles
    SET 
      username = 'Deleted User',
      avatar_url = NULL,
      contact_no = NULL,
      verification_doc_no = NULL,
      verification_doc_url = NULL,
      emergency_contact_no = NULL,
      is_verified = false
    WHERE id IN (SELECT id FROM deleted_candidates)
    RETURNING id
  )
  -- Permanently delete from auth.users
  DELETE FROM auth.users 
  WHERE id IN (SELECT id FROM deleted_candidates);
  $$
);
