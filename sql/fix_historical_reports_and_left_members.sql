-- ==============================================================================
-- Fix: Preserve Member History and Accurate Month-Scoped Financial Reports
-- ==============================================================================

-- 1. Restore left members so historical records (meals, deposits, summaries) retain 100% data integrity
INSERT INTO public.mess_members (mess_id, user_id, status, role, joined_at, left_at)
VALUES (
  '7a0ae709-c698-490e-9108-5d3104f94310',
  'b5184b7b-8d53-488e-a187-752a052b3c44',
  'left',
  'member',
  '2026-05-07 05:12:29+00',
  '2026-07-29 00:00:00+00'
)
ON CONFLICT (mess_id, user_id) DO UPDATE
SET status = 'left', left_at = '2026-07-29 00:00:00+00';

-- 2. Stop cron from hard-deleting left members. Members who leave must be kept with status = 'left'.
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
      RAISE NOTICE 'Failed to archive mess % for %: %', v_mess.id, v_prev_month, SQLERRM;
    END;
  END LOOP;

  INSERT INTO public.monthly_reports_cron_log (month, mess_count)
  VALUES (v_prev_month, v_archived)
  ON CONFLICT (month) DO UPDATE SET mess_count = EXCLUDED.mess_count, ran_at = now();
END;
$$;

-- 3. Calculate member balance scoped accurately to the target month's active members
CREATE OR REPLACE FUNCTION public.calculate_member_balance(p_user_id uuid, p_mess_id uuid, p_month text)
 RETURNS TABLE(personal_meals numeric, total_mess_meals numeric, total_mess_bazaar numeric, meal_rate numeric, individual_cost numeric, total_deposits numeric, balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_month_start date := to_date(p_month, 'YYYY-MM');
  v_month_end   date := to_date(p_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month' - INTERVAL '1 day';
  v_personal_meals NUMERIC;
  v_total_mess_meals NUMERIC;
  v_total_mess_bazaar NUMERIC;
  v_meal_rate NUMERIC;
  v_individual_cost NUMERIC;
  v_total_deposits NUMERIC;
  v_total_fixed NUMERIC;
  v_member_count INT;
  v_per_person_fixed NUMERIC;
  v_balance NUMERIC;
BEGIN
  -- 1. Calculate personal meals (including guests) for p_month
  SELECT COALESCE(SUM(
    (CASE WHEN lunch THEN 1 ELSE 0 END) + 
    (CASE WHEN dinner THEN 1 ELSE 0 END) + 
    COALESCE(guest_lunch, 0) + 
    COALESCE(guest_dinner, 0)
  ), 0)
  INTO v_personal_meals
  FROM public.meals
  WHERE user_id = p_user_id 
    AND mess_id = p_mess_id 
    AND date BETWEEN v_month_start AND v_month_end;

  -- 2. Calculate total mess meals (including guests) for p_month
  SELECT COALESCE(SUM(
    (CASE WHEN lunch THEN 1 ELSE 0 END) + 
    (CASE WHEN dinner THEN 1 ELSE 0 END) + 
    COALESCE(guest_lunch, 0) + 
    COALESCE(guest_dinner, 0)
  ), 0)
  INTO v_total_mess_meals
  FROM public.meals
  WHERE mess_id = p_mess_id 
    AND date BETWEEN v_month_start AND v_month_end;

  -- 3. Calculate total bazaar expenses for p_month
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_mess_bazaar
  FROM public.expenses
  WHERE mess_id = p_mess_id 
    AND (expense_type = 'bazaar' OR expense_type IS NULL)
    AND date BETWEEN v_month_start AND v_month_end;

  -- 4. Calculate meal rate
  IF v_total_mess_meals > 0 THEN
    v_meal_rate := v_total_mess_bazaar / v_total_mess_meals;
  ELSE
    v_meal_rate := 0;
  END IF;

  -- 5. Calculate individual cost
  v_individual_cost := v_personal_meals * v_meal_rate;

  -- 6. Calculate total deposits (only verified) for p_month
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_deposits
  FROM public.deposits
  WHERE user_id = p_user_id 
    AND mess_id = p_mess_id 
    AND verified = true
    AND date BETWEEN v_month_start AND v_month_end;

  -- 6b. Calculate total fixed costs and member count to deduct member's share
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_fixed
  FROM public.fixed_costs
  WHERE mess_id = p_mess_id 
    AND month = p_month;

  -- Accurately count members who were in the mess during p_month (or had activity in p_month)
  SELECT COUNT(DISTINCT user_id)::INT
  INTO v_member_count
  FROM (
    SELECT mm.user_id
    FROM public.mess_members mm
    WHERE mm.mess_id = p_mess_id
      AND mm.status IN ('approved', 'left')
      AND mm.joined_at::date <= v_month_end
      AND (mm.left_at IS NULL OR mm.left_at::date >= v_month_start)
    UNION
    SELECT m.user_id
    FROM public.meals m
    WHERE m.mess_id = p_mess_id
      AND m.date BETWEEN v_month_start AND v_month_end
    UNION
    SELECT d.user_id
    FROM public.deposits d
    WHERE d.mess_id = p_mess_id
      AND d.verified = true
      AND d.date BETWEEN v_month_start AND v_month_end
  ) active_members_in_month;

  IF v_member_count > 0 THEN
    v_per_person_fixed := v_total_fixed / v_member_count;
  ELSE
    v_per_person_fixed := 0;
  END IF;

  -- 7. Calculate balance (subtracting individual meal cost and fixed cost share)
  v_balance := v_total_deposits - (v_individual_cost + v_per_person_fixed);

  -- Return results
  RETURN QUERY SELECT 
    ROUND(v_personal_meals::NUMERIC, 2),
    ROUND(v_total_mess_meals::NUMERIC, 2),
    ROUND(v_total_mess_bazaar::NUMERIC, 2),
    ROUND(v_meal_rate::NUMERIC, 2),
    ROUND(v_individual_cost::NUMERIC, 2),
    ROUND(v_total_deposits::NUMERIC, 2),
    ROUND(v_balance::NUMERIC, 2);
END;
$function$;

-- 4. Monthly report archiving with comprehensive month-scoped member resolution
CREATE OR REPLACE FUNCTION public.archive_monthly_report(p_mess_id uuid, p_month text)
 RETURNS monthly_reports
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Global totals for the month
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

  -- Total meals
  SELECT COALESCE(SUM(
    (CASE WHEN lunch  THEN 1 ELSE 0 END) +
    (CASE WHEN dinner THEN 1 ELSE 0 END) +
    COALESCE(guest_lunch, 0) + COALESCE(guest_dinner, 0)
  ), 0) INTO v_total_meals
  FROM public.meals
  WHERE mess_id = p_mess_id AND date BETWEEN v_month_start AND v_month_end;

  -- Meal rate
  v_meal_rate := CASE WHEN v_total_meals > 0
                      THEN v_total_expenses / v_total_meals
                      ELSE 0 END;

  -- Per-member breakdown for all members who belonged to or had records in p_month
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

  -- Fixed cost rows for the PDF
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'description', fc.category || COALESCE(' (' || fc.label || ')', ''),
    'amount',      fc.amount
  )), '[]'::jsonb) INTO v_fixed
  FROM public.fixed_costs fc
  WHERE fc.mess_id = p_mess_id AND fc.month = p_month;

  -- Daily bazaar expenses for the PDF
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

  -- Daily meals for the PDF
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

  -- Daily verified deposits for the PDF
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

  INSERT INTO public.monthly_reports (mess_id, month, generated_by, summary)
  VALUES (p_mess_id, p_month, NULL, v_summary)
  ON CONFLICT (mess_id, month) DO UPDATE
    SET summary      = EXCLUDED.summary,
        generated_at = now(),
        generated_by = COALESCE(monthly_reports.generated_by, EXCLUDED.generated_by)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;
