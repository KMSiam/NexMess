-- =====================================================================
-- Monthly Report Archive — History section (manager-only)
--
-- Compiles a completed month's finance snapshot (totals + meals + per-member
-- breakdown) into `monthly_reports` as JSONB. The History page lists these
-- rows and renders the PDF client-side (jspdf + autotable) from the JSON.
--
-- Two triggers call the same `archive_monthly_report` function:
--   1. pg_cron     — auto-archives the just-ended month on the 1st, 00:05
--   2. RPC (manual) — managers click "Generate for month" to backfill/on-demand
--
-- Deploy: paste this whole file into the Supabase SQL Editor and Run.
-- NOTE: pg_cron requires the Supabase Pro plan or higher. On the free tier
--       the schedule is skipped, but the manual "Generate for month" button
--       on the History page still works.
-- =====================================================================

-- 0. pg_cron extension (idempotent; no-op if unavailable)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id      uuid        NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  month        text        NOT NULL,                       -- 'YYYY-MM'
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,                                       -- NULL = auto (cron)
  summary      jsonb       NOT NULL DEFAULT '{}'::jsonb,  -- compiled snapshot
  UNIQUE (mess_id, month)
);

CREATE INDEX IF NOT EXISTS monthly_reports_mess_id_idx ON public.monthly_reports (mess_id);

-- Track when the cron last ran per month (idempotency / observability).
CREATE TABLE IF NOT EXISTS public.monthly_reports_cron_log (
  month      text PRIMARY KEY,
  mess_count int  NOT NULL,
  ran_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports_cron_log ENABLE ROW LEVEL SECURITY;

-- Managers of the mess can read its archived reports.
DROP POLICY IF EXISTS "Managers can read monthly reports" ON public.monthly_reports;
CREATE POLICY "Managers can read monthly reports"
ON public.monthly_reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = monthly_reports.mess_id
      AND user_id = auth.uid()
      AND role    = 'manager'
      AND status  = 'approved'
  )
);
-- (INSERT happens via the SECURITY DEFINER functions below, which bypass RLS.)


-- ─────────────────────────────────────────────────────────────────────
-- 2. archive_monthly_report(p_mess_id, p_month)
--    Single source of truth for "compile a month". Called by cron + manual RPC.
--    SECURITY DEFINER so it runs as the owner and can write past RLS and read
--    every member's balances server-side.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.archive_monthly_report(
  p_mess_id uuid,
  p_month   text   -- 'YYYY-MM'
)
RETURNS public.monthly_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date   := to_date(p_month, 'YYYY-MM');
  v_month_end   date   := to_date(p_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day';
  v_total_expenses numeric;
  v_total_deposits numeric;
  v_total_fixed    numeric;
  v_total_meals    int;
  v_meal_rate      numeric;
  v_member_count   int;
  v_balances       jsonb := '[]'::jsonb;
  v_fixed          jsonb := '[]'::jsonb;
  v_daily_expenses jsonb := '[]'::jsonb;
  v_daily_meals    jsonb := '[]'::jsonb;
  v_daily_deposits jsonb := '[]'::jsonb;
  v_summary        jsonb;
  v_row            public.monthly_reports%ROWTYPE;
  v_member         RECORD;
  v_bal            json;
BEGIN
  IF p_month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month format (expected YYYY-MM): %', p_month
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- ── Global totals for the month ──────────────────────────────
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.expenses
  WHERE mess_id = p_mess_id AND date BETWEEN v_month_start AND v_month_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM public.deposits
  WHERE mess_id = p_mess_id AND verified = true
    AND date BETWEEN v_month_start AND v_month_end;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_fixed
  FROM public.fixed_costs
  WHERE mess_id = p_mess_id AND month = p_month;

  -- Total meals: 1 per lunch + 1 per dinner + guest meals
  SELECT COALESCE(SUM(
    (CASE WHEN lunch  THEN 1 ELSE 0 END) +
    (CASE WHEN dinner THEN 1 ELSE 0 END) +
    COALESCE(guest_lunch, 0) + COALESCE(guest_dinner, 0)
  ), 0) INTO v_total_meals
  FROM public.meals
  WHERE mess_id = p_mess_id AND date BETWEEN v_month_start AND v_month_end;

  -- Meal rate = bazaar expenses / total meals (guarded against /0)
  v_meal_rate := CASE WHEN v_total_meals > 0
                      THEN v_total_expenses / v_total_meals
                      ELSE 0 END;

  -- ── Per-member breakdown for all members who belonged to or had records in p_month ──
  FOR v_member IN
    SELECT DISTINCT ru.user_id, ru.status, COALESCE(p.username, 'Member') AS username
    FROM (
      -- 1. Members who were in the mess during this month
      SELECT mm.user_id, mm.status
      FROM public.mess_members mm
      WHERE mm.mess_id = p_mess_id
        AND mm.status IN ('approved', 'left')
        AND mm.joined_at::date <= v_month_end
        AND (mm.left_at IS NULL OR mm.left_at::date >= v_month_start)
      UNION
      -- 2. Any member who had meals in this mess during this month
      SELECT m.user_id, COALESCE(mm.status, 'left') AS status
      FROM public.meals m
      LEFT JOIN public.mess_members mm ON mm.mess_id = m.mess_id AND mm.user_id = m.user_id
      WHERE m.mess_id = p_mess_id AND m.date BETWEEN v_month_start AND v_month_end
      UNION
      -- 3. Any member who had verified deposits in this mess during this month
      SELECT d.user_id, COALESCE(mm.status, 'left') AS status
      FROM public.deposits d
      LEFT JOIN public.mess_members mm ON mm.mess_id = d.mess_id AND mm.user_id = d.user_id
      WHERE d.mess_id = p_mess_id AND d.verified = true AND d.date BETWEEN v_month_start AND v_month_end
    ) ru
    LEFT JOIN public.profiles p ON p.id = ru.user_id
    ORDER BY username ASC
  LOOP
    v_bal := NULL;
    SELECT row_to_json(r) INTO v_bal
    FROM public.calculate_member_balance(v_member.user_id, p_mess_id, p_month) r;

    IF v_bal IS NULL THEN
      v_bal := '{}'::json;
    END IF;

    v_balances := v_balances || jsonb_build_object(
      'user_id',         v_member.user_id,
      'username',        v_member.username,
      'status',          v_member.status,
      'personal_meals',  COALESCE((v_bal->>'personal_meals')::numeric, 0),
      'individual_cost', COALESCE((v_bal->>'individual_cost')::numeric, 0),
      'total_deposits',  COALESCE((v_bal->>'total_deposits')::numeric, 0)
    );
  END LOOP;

  v_member_count := jsonb_array_length(v_balances);

  -- ── Fixed cost rows for the PDF ──────────────────────────────
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'description', fc.category || COALESCE(' (' || fc.label || ')', ''),
    'amount',      fc.amount
  )), '[]'::jsonb) INTO v_fixed
  FROM public.fixed_costs fc
  WHERE fc.mess_id = p_mess_id AND fc.month = p_month;

  -- ── Daily bazaar expenses for the PDF ────────────────────────
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date',        e.date,
    'category',    COALESCE(e.category, ''),
    'description', COALESCE(e.description, ''),
    'amount',      e.amount,
    'logged_by',   COALESCE(p.username, 'Unknown')
  ) ORDER BY e.date ASC), '[]'::jsonb) INTO v_daily_expenses
  FROM public.expenses e
  LEFT JOIN public.profiles p ON p.id = e.created_by
  WHERE e.mess_id = p_mess_id AND e.date BETWEEN v_month_start AND v_month_end;

  -- ── Daily meals for the PDF ──────────────────────────────────
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date',         m.date,
    'username',     COALESCE(p.username, 'Member'),
    'user_id',      m.user_id,
    'lunch',        m.lunch,
    'dinner',       m.dinner,
    'guest_lunch',  COALESCE(m.guest_lunch, 0),
    'guest_dinner', COALESCE(m.guest_dinner, 0)
  ) ORDER BY m.date ASC), '[]'::jsonb) INTO v_daily_meals
  FROM public.meals m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.mess_id = p_mess_id AND m.date BETWEEN v_month_start AND v_month_end;

  -- ── Daily verified deposits for the PDF ──────────────────────
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date',      d.date,
    'username',  COALESCE(p.username, 'Member'),
    'amount',    d.amount,
    'note',      COALESCE(d.note, '')
  ) ORDER BY d.date ASC), '[]'::jsonb) INTO v_daily_deposits
  FROM public.deposits d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.mess_id = p_mess_id AND d.verified = true AND d.date BETWEEN v_month_start AND v_month_end;

  v_summary := jsonb_build_object(
    'month',               p_month,
    'totalExpenses',       v_total_expenses,
    'totalDeposits',       v_total_deposits,
    'totalFixed',          v_total_fixed,
    'totalMeals',          v_total_meals,
    'mealRate',            v_meal_rate,
    'financeMembersCount', v_member_count,
    'balances',            v_balances,
    'fixedCosts',          v_fixed,
    'dailyExpenses',       v_daily_expenses,
    'dailyMeals',          v_daily_meals,
    'dailyDeposits',       v_daily_deposits
  );

  -- ── Upsert the compiled snapshot ─────────────────────────────
  INSERT INTO public.monthly_reports (mess_id, month, generated_by, summary)
  VALUES (p_mess_id, p_month, NULL, v_summary)
  ON CONFLICT (mess_id, month) DO UPDATE
    SET summary      = EXCLUDED.summary,
        generated_at = now(),
        generated_by = COALESCE(monthly_reports.generated_by, EXCLUDED.generated_by)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_monthly_report(uuid, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 3. Manual RPC wrapper — used by the History page "Generate for month".
--    Verifies the caller is a manager of the mess, stamps generated_by,
--    then delegates to archive_monthly_report.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_monthly_report(
  p_mess_id uuid,
  p_month   text
)
RETURNS public.monthly_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_manager boolean;
  v_row        public.monthly_reports%ROWTYPE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = p_mess_id
      AND user_id = auth.uid()
      AND role    = 'manager'
      AND status  = 'approved'
  ) INTO v_is_manager;

  IF NOT v_is_manager THEN
    RAISE EXCEPTION 'Only managers can generate monthly reports'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_row FROM public.archive_monthly_report(p_mess_id, p_month);

  -- Stamp the manager who triggered it (does not overwrite an existing source).
  UPDATE public.monthly_reports
     SET generated_by = auth.uid()
   WHERE id = v_row.id AND generated_by IS NULL;

  SELECT * INTO v_row FROM public.monthly_reports WHERE id = v_row.id;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_monthly_report(uuid, text) TO authenticated;


-- ─────────────────────────────────────────────────────────────────────
-- 4. pg_cron schedule — auto-archive the previous month for every active
--    mess on the 1st of each month at 00:05. Idempotent: re-running this
--    file safely drops + recreates the job.
-- ─────────────────────────────────────────────────────────────────────
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
END;
$$;

-- Unschedule any prior copy of the job, then schedule it.
DO $$
BEGIN
  PERFORM cron.unschedule('archive-monthly-reports');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Runs at 00:05 on the 1st of every month.
SELECT cron.schedule(
  'archive-monthly-reports',
  '5 0 1 * *',
  $$SELECT public.cron_archive_previous_month();$$
);
