-- 1. Add `left_at` column to `mess_members` table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'mess_members' 
      AND column_name = 'left_at'
  ) THEN
    ALTER TABLE public.mess_members ADD COLUMN left_at timestamptz;
  END IF;
END $$;

-- 2. Update existing 'left' members to have left_at set to their joined_at so they are cleaned up on the next cron run
UPDATE public.mess_members
SET left_at = joined_at
WHERE status = 'left' AND left_at IS NULL;

-- 3. Update the cron_archive_previous_month function to completely remove left members
CREATE OR REPLACE FUNCTION public.cron_archive_previous_month()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev_month text := to_char((now() - INTERVAL '1 month'), 'YYYY-MM');
  v_mess       RECORD;
  v_archived   int  := 0;
BEGIN
  FOR v_mess IN SELECT id FROM public.messes WHERE is_active = true LOOP
    BEGIN
      PERFORM public.archive_monthly_report(v_mess.id, v_prev_month);
      v_archived := v_archived + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Don't let one mess's failure abort the rest.
      RAISE NOTICE 'Failed to archive mess % for %: %', v_mess.id, v_prev_month, SQLERRM;
    END;
  END LOOP;

  INSERT INTO public.monthly_reports_cron_log (month, mess_count)
  VALUES (v_prev_month, v_archived)
  ON CONFLICT (month) DO UPDATE SET mess_count = EXCLUDED.mess_count, ran_at = now();

  -- COMPLETELY REMOVE LEFT MEMBERS
  -- Remove members who left in the previous month or earlier.
  -- date_trunc('month', now()) gives the first day of the current month.
  -- So if left_at is before this month, it means they left in a previous month.
  DELETE FROM public.mess_members
  WHERE status = 'left' 
    AND left_at < date_trunc('month', now());
END;
$$;
