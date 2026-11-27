-- =====================================================================
-- NexMess v2.18.0 Selective High-Signal Notifications
-- =====================================================================

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'bazaar_reminder',
    'bazaar_removed',
    'market_reminder',
    'join_request',
    'join_approved',
    'join_rejected',
    'expense_added',
    'expense_updated',
    'expense_deleted',
    'deposit_recorded',
    'deposit_verified',
    'deposit_deleted',
    'fixed_cost_added',
    'fixed_cost_paid',
    'notice_posted',
    'meal_updated',
    'meal_reminder',
    'monthly_report',
    'balance_due',
    'role_transfer',
    'role_changed',
    'profile_verified',
    'member_removed',
    'member_left',
    'system'
  ]::text[])
);

CREATE OR REPLACE FUNCTION public.notify_bazaar_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mess_name TEXT;
  v_today_dhaka DATE := (now() AT TIME ZONE 'Asia/Dhaka')::date;
BEGIN
  IF OLD.assigned_date >= v_today_dhaka
     AND OLD.user_id IS DISTINCT FROM auth.uid()
     AND EXISTS (SELECT 1 FROM public.messes WHERE id = OLD.mess_id)
     AND EXISTS (
       SELECT 1 FROM public.mess_members
       WHERE mess_id = OLD.mess_id AND user_id = OLD.user_id AND status = 'approved'
     ) THEN
    SELECT name INTO v_mess_name FROM public.messes WHERE id = OLD.mess_id;
    INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, metadata)
    VALUES (
      OLD.user_id,
      OLD.mess_id,
      'bazaar_removed',
      'Bazaar duty removed',
      'Your bazaar assignment on ' || OLD.assigned_date || ' in ' || COALESCE(v_mess_name, 'your mess') || ' was removed.',
      '/market?tab=bazaar',
      jsonb_build_object(
        'assigned_date', OLD.assigned_date,
        'mess_name', COALESCE(v_mess_name, 'your mess')
      )
    );
  END IF;
  RETURN OLD;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_bazaar_removed'
      AND tgrelid = 'public.market_schedules'::regclass
  ) THEN
    CREATE TRIGGER on_bazaar_removed
    AFTER DELETE ON public.market_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_bazaar_removed();
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.notify_bazaar_removed() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cron_archive_previous_month()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_month text := to_char((now() - INTERVAL '1 month'), 'YYYY-MM');
  v_mess       RECORD;
  v_mgr        RECORD;
  v_archived   int  := 0;
BEGIN
  FOR v_mess IN SELECT id, name FROM public.messes WHERE is_active = true LOOP
    BEGIN
      PERFORM public.archive_monthly_report(v_mess.id, v_prev_month);
      v_archived := v_archived + 1;

      FOR v_mgr IN
        SELECT user_id FROM public.mess_members
        WHERE mess_id = v_mess.id AND role = 'manager' AND status = 'approved'
      LOOP
        INSERT INTO public.notifications (user_id, mess_id, type, title, body, url, metadata)
        VALUES (
          v_mgr.user_id,
          v_mess.id,
          'monthly_report',
          'Monthly report ready',
          'Monthly financial archive for ' || v_prev_month || ' in ' || COALESCE(v_mess.name, 'your mess') || ' is ready.',
          '/finance?tab=history',
          jsonb_build_object('month', v_prev_month, 'mess_name', COALESCE(v_mess.name, 'your mess'))
        );
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Failed to archive mess % for %: %', v_mess.id, v_prev_month, SQLERRM;
    END;
  END LOOP;

  INSERT INTO public.monthly_reports_cron_log (month, mess_count)
  VALUES (v_prev_month, v_archived)
  ON CONFLICT (month) DO UPDATE SET mess_count = EXCLUDED.mess_count, ran_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.cron_archive_previous_month() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_archive_previous_month() TO service_role;
