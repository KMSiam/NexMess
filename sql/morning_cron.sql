-- =====================================================================
-- Morning Bazaar Reminder — pg_cron Schedule
-- Calls the `morning-reminder` Edge Function every day at 7:00 AM BST
-- BST (UTC+6) → 01:00 UTC
-- =====================================================================
-- Prerequisites:
--   1. pg_cron extension enabled (Supabase Dashboard → Database → Extensions)
--   2. pg_net extension enabled (already used for push notifications)
--   3. `morning-reminder` edge function deployed
--   4. Replace <YOUR-PROJECT-ID> and <YOUR_SUPABASE_ANON_KEY> below with your project credentials
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
    url := 'https://<YOUR-PROJECT-ID>.supabase.co/functions/v1/morning-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', '<YOUR_SUPABASE_ANON_KEY>',
      'Authorization', 'Bearer <YOUR_SUPABASE_ANON_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- =====================================================================
-- Note: Replace <YOUR-PROJECT-ID> and <YOUR_SUPABASE_ANON_KEY> with your
-- actual project credentials before executing this query. The cron job
-- calls the morning-reminder function using the anon key for gateway
-- authentication. The function itself runs securely on the server with
-- full database access.
-- =====================================================================

-- Verify the job was created:
-- SELECT * FROM cron.job WHERE jobname = 'morning-bazaar-reminder';

-- Check recent job runs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
