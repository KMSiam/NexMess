-- =====================================================================
-- Morning Bazaar Reminder — pg_cron Schedule
-- Calls the `morning-reminder` Edge Function every day at 7:00 AM BST
-- BST (UTC+6) → 01:00 UTC
-- =====================================================================
-- Prerequisites:
--   1. pg_cron extension enabled (Supabase Dashboard → Database → Extensions)
--   2. pg_net extension enabled (already used for push notifications)
--   3. `morning-reminder` edge function deployed
-- =====================================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove existing schedule if re-running this migration
SELECT cron.unschedule('morning-bazaar-reminder')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'morning-bazaar-reminder'
);

-- Schedule: Every day at 01:00 UTC (= 07:00 AM BST)
SELECT cron.schedule(
  'morning-bazaar-reminder',       -- job name
  '0 1 * * *',                     -- cron expression: minute=0, hour=1(UTC), every day
  $$
  SELECT net.http_post(
    url := 'https://aaszanlxspgouomjpruz.supabase.co/functions/v1/morning-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhc3phbmx4c3Bnb3VvbWpwcnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA5OTgyOCwiZXhwIjoyMDkzNjc1ODI4fQ.placeholder_replace_with_actual_service_role_key'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================================================================
-- IMPORTANT: Before running this SQL, replace the Authorization Bearer
-- token above with your actual SUPABASE_SERVICE_ROLE_KEY.
--
-- You can find it in:
--   Supabase Dashboard → Settings → API → service_role (secret)
--
-- The anon key will NOT work here because the morning-reminder function
-- uses the service role internally to query across all messes.
-- =====================================================================

-- Verify the job was created:
-- SELECT * FROM cron.job WHERE jobname = 'morning-bazaar-reminder';

-- Check recent job runs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
