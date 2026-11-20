-- Trigger to send Web Push notifications when a new notification is inserted in public.notifications
-- Runs asynchronously via the pg_net extension
--
-- IMPORTANT: Before running this query, replace:
--   1. <YOUR-PROJECT-ID> with your Supabase Project ID
--   2. <YOUR_SUPABASE_ANON_KEY> with your Supabase Anon Key

-- Add url column if it doesn't exist (for push notification redirect)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN url text DEFAULT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.tr_send_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_apikey TEXT := '<YOUR_SUPABASE_ANON_KEY>';
BEGIN
  PERFORM net.http_post(
    url := 'https://<YOUR-PROJECT-ID>.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_apikey,
      'Authorization', 'Bearer ' || v_apikey
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'title', NEW.title,
      'body', COALESCE(NEW.body, ''),
      'url', COALESCE(NEW.url, '/dashboard')
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notifications_send_push ON public.notifications;
CREATE TRIGGER tr_notifications_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.tr_send_push_notification();
