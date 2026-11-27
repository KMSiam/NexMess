-- =====================================================================
-- NexMess v2.17.0 Notification System Overhaul
-- Reference migration template (replace <YOUR-PROJECT-ID> and <YOUR_SUPABASE_ANON_KEY>)
-- =====================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'url'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN url text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'push_dispatched_at'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN push_dispatched_at timestamptz DEFAULT NULL;
  END IF;
END $$;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'bazaar_reminder',
    'market_reminder',
    'join_request',
    'join_approved',
    'join_rejected',
    'expense_added',
    'deposit_recorded',
    'deposit_verified',
    'deposit_deleted',
    'fixed_cost_added',
    'fixed_cost_paid',
    'notice_posted',
    'meal_updated',
    'meal_reminder',
    'balance_due',
    'role_transfer',
    'role_changed',
    'profile_verified',
    'member_removed',
    'system'
  ]::text[])
);

UPDATE public.notifications
SET url = CASE
  WHEN type = 'bazaar_reminder' AND title ILIKE '%today%' THEN '/nexmess-ai'
  WHEN type = 'bazaar_reminder' THEN '/market?tab=bazaar'
  WHEN type = 'market_reminder' THEN '/nexmess-ai'
  WHEN type = 'expense_added' THEN '/finance?tab=expenses'
  WHEN type IN ('deposit_recorded', 'deposit_verified', 'deposit_deleted') THEN '/finance?tab=deposits'
  WHEN type = 'system' AND title = 'Deposit Deleted' THEN '/finance?tab=deposits'
  WHEN type IN ('fixed_cost_added', 'fixed_cost_paid') THEN '/finance?tab=fixed'
  WHEN type = 'balance_due' THEN '/finance?tab=summary'
  WHEN type = 'join_request' THEN '/settings?tab=members'
  WHEN type = 'join_approved' THEN '/dashboard'
  WHEN type = 'join_rejected' THEN '/mess/join'
  WHEN type = 'member_removed' THEN '/dashboard'
  WHEN type IN ('role_changed', 'role_transfer') THEN '/settings?tab=members'
  WHEN type = 'profile_verified' THEN '/settings?tab=profile'
  WHEN type IN ('meal_updated', 'meal_reminder') THEN '/meals'
  ELSE '/dashboard'
END
WHERE url IS NULL;

CREATE OR REPLACE FUNCTION public.notify_bazaar_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mess_name TEXT;
BEGIN
  SELECT name INTO mess_name FROM public.messes WHERE id = NEW.mess_id;
  INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, metadata)
  VALUES (
    NEW.user_id,
    NEW.mess_id,
    'bazaar_reminder',
    '🛒 Bazaar duty assigned!',
    'You are assigned for bazaar on ' || NEW.assigned_date || ' in ' || COALESCE(mess_name, 'your mess') || '.',
    '/market?tab=bazaar',
    jsonb_build_object(
      'assigned_date', NEW.assigned_date,
      'mess_name', COALESCE(mess_name, 'your mess')
    )
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_expense_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  creator_name TEXT;
  member_rec RECORD;
BEGIN
  SELECT username INTO creator_name FROM public.profiles WHERE id = NEW.created_by;

  FOR member_rec IN
    SELECT user_id FROM public.mess_members
    WHERE mess_id = NEW.mess_id
      AND status = 'approved'
      AND user_id IS DISTINCT FROM NEW.created_by
  LOOP
    INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, metadata)
    VALUES (
      member_rec.user_id,
      NEW.mess_id,
      'expense_added',
      '💰 New expense: ৳' || NEW.amount,
      COALESCE(creator_name, 'A member') || ' added an expense' ||
      CASE WHEN NEW.description IS NOT NULL THEN ': ' || NEW.description ELSE '' END || '.',
      '/finance?tab=expenses',
      jsonb_build_object(
        'expense_id', NEW.id,
        'amount', NEW.amount,
        'category', COALESCE(NEW.category, 'bazaar')
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_deposit_deleted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.messes WHERE id = OLD.mess_id)
     AND EXISTS (
       SELECT 1 FROM public.mess_members
       WHERE mess_id = OLD.mess_id AND user_id = OLD.user_id AND status = 'approved'
     ) THEN
    INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, is_read, metadata)
    VALUES (
      OLD.user_id,
      OLD.mess_id,
      'deposit_deleted',
      'Deposit Deleted',
      'A deposit of ৳' || OLD.amount || ' was deleted by a manager.',
      '/finance?tab=deposits',
      false,
      jsonb_build_object('amount', OLD.amount)
    );
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_join_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  mess_name TEXT;
  requester_name TEXT;
  mgr_id UUID;
  mgr_rec RECORD;
  notified_count INT := 0;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
     OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'pending' AND NEW.status = 'pending') THEN
    SELECT name, manager_id INTO mess_name, mgr_id FROM public.messes WHERE id = NEW.mess_id;
    SELECT username INTO requester_name FROM public.profiles WHERE id = NEW.user_id;

    FOR mgr_rec IN
      SELECT user_id FROM public.mess_members
      WHERE mess_id = NEW.mess_id
        AND role = 'manager'
        AND status = 'approved'
        AND user_id IS DISTINCT FROM NEW.user_id
    LOOP
      INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, metadata)
      VALUES (
        mgr_rec.user_id,
        NEW.mess_id,
        'join_request',
        'New join request',
        COALESCE(requester_name, 'Someone') || ' wants to join ' || COALESCE(mess_name, 'your mess') || '.',
        '/settings?tab=members',
        jsonb_build_object(
          'requester_id', NEW.user_id,
          'mess_name', COALESCE(mess_name, 'your mess')
        )
      );
      notified_count := notified_count + 1;
    END LOOP;

    IF notified_count = 0 AND mgr_id IS NOT NULL AND mgr_id IS DISTINCT FROM NEW.user_id THEN
      INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, metadata)
      VALUES (
        mgr_id,
        NEW.mess_id,
        'join_request',
        'New join request',
        COALESCE(requester_name, 'Someone') || ' wants to join ' || COALESCE(mess_name, 'your mess') || '.',
        '/settings?tab=members',
        jsonb_build_object(
          'requester_id', NEW.user_id,
          'mess_name', COALESCE(mess_name, 'your mess')
        )
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'approved' THEN
    SELECT name INTO mess_name FROM public.messes WHERE id = NEW.mess_id;
    INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, metadata)
    VALUES (
      NEW.user_id,
      NEW.mess_id,
      'join_approved',
      'Request approved! 🎉',
      'You are now a member of ' || COALESCE(mess_name, 'the mess') || '.',
      '/dashboard',
      jsonb_build_object('mess_name', COALESCE(mess_name, 'the mess'))
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_send_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'mess_id', NEW.mess_id,
      'type', NEW.type,
      'title', NEW.title,
      'body', COALESCE(NEW.body, ''),
      'url', COALESCE(NEW.url, '/dashboard')
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_bazaar_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_deposit_deleted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_expense_added() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_join_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tr_send_push_notification() FROM PUBLIC, anon, authenticated;
