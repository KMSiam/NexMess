import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

const GENERATE_REPORT_FN = `
CREATE OR REPLACE FUNCTION public.generate_monthly_report(p_mess_id uuid, p_month text)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date date := (p_month || '-01')::date;
  v_end_date   date := (v_start_date + interval '1 month - 1 day')::date;
  v_total_expenses   numeric;
  v_total_deposits   numeric;
  v_total_fixed      numeric;
  v_total_meals      numeric;
  v_meal_rate        numeric;
  v_member_count     integer;
  v_balances         jsonb;
  v_fixed_costs      jsonb;
  v_daily_expenses   jsonb;
  v_daily_meals      jsonb;
  v_daily_deposits   jsonb;
  v_summary          jsonb;
  v_manager_id       uuid;
BEGIN
  -- Get total expenses (bazaar)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.expenses
  WHERE mess_id = p_mess_id AND date BETWEEN v_start_date AND v_end_date AND expense_type = 'bazaar';

  -- Get total deposits (verified)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits
  FROM public.deposits
  WHERE mess_id = p_mess_id AND date BETWEEN v_start_date AND v_end_date AND verified = true;

  -- Get total fixed costs
  SELECT COALESCE(SUM(amount), 0) INTO v_total_fixed
  FROM public.fixed_costs
  WHERE mess_id = p_mess_id AND month = p_month;

  -- Get approved member count
  SELECT COUNT(*)::int INTO v_member_count
  FROM public.mess_members
  WHERE mess_id = p_mess_id AND status = 'approved';

  -- Get total mess meals
  SELECT COALESCE(SUM(
    (CASE WHEN m.lunch THEN 1 ELSE 0 END) +
    (CASE WHEN m.dinner THEN 1 ELSE 0 END) +
    COALESCE(m.guest_lunch, 0) +
    COALESCE(m.guest_dinner, 0)
  ), 0) INTO v_total_meals
  FROM public.meals m
  JOIN public.mess_members mm ON mm.user_id = m.user_id AND mm.mess_id = m.mess_id
  WHERE m.mess_id = p_mess_id AND m.date BETWEEN v_start_date AND v_end_date AND mm.status = 'approved';

  -- Meal rate
  v_meal_rate := CASE WHEN v_total_meals > 0 THEN v_total_expenses / v_total_meals ELSE 0 END;

  -- Balances array
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'user_id', b.user_id,
    'username', p.username,
    'status', mm.status,
    'personal_meals', b.total_meals,
    'individual_cost', b.meal_cost,
    'total_deposits', b.total_deposits
  )), '[]'::jsonb) INTO v_balances
  FROM public.calculate_member_balance(p_mess_id, p_month) b
  JOIN public.profiles p ON p.id = b.user_id
  JOIN public.mess_members mm ON mm.user_id = b.user_id AND mm.mess_id = p_mess_id;

  -- Fixed costs list
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'category', fc.category,
    'label', fc.label,
    'amount', fc.amount,
    'is_paid', fc.is_paid
  )), '[]'::jsonb) INTO v_fixed_costs
  FROM public.fixed_costs fc
  WHERE fc.mess_id = p_mess_id AND fc.month = p_month;

  -- Daily expenses list (ordered)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', e.date,
    'amount', e.amount,
    'category', e.category,
    'description', e.description,
    'username', p.username
  ) ORDER BY e.date ASC, e.created_at ASC), '[]'::jsonb) INTO v_daily_expenses
  FROM public.expenses e
  LEFT JOIN public.profiles p ON p.id = e.created_by
  WHERE e.mess_id = p_mess_id AND e.date BETWEEN v_start_date AND v_end_date AND e.expense_type = 'bazaar';

  -- Daily meals list (ordered)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', m.date,
    'user_id', m.user_id,
    'lunch', m.lunch,
    'dinner', m.dinner,
    'guest_lunch', m.guest_lunch,
    'guest_dinner', m.guest_dinner,
    'username', p.username
  ) ORDER BY m.date ASC, p.username ASC), '[]'::jsonb) INTO v_daily_meals
  FROM public.meals m
  LEFT JOIN public.profiles p ON p.id = m.user_id
  WHERE m.mess_id = p_mess_id AND m.date BETWEEN v_start_date AND v_end_date;

  -- Daily deposits list (ordered)
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', d.date,
    'amount', d.amount,
    'note', d.note,
    'username', p.username
  ) ORDER BY d.date ASC, d.created_at ASC), '[]'::jsonb) INTO v_daily_deposits
  FROM public.deposits d
  LEFT JOIN public.profiles p ON p.id = d.user_id
  WHERE d.mess_id = p_mess_id AND d.date BETWEEN v_start_date AND v_end_date AND d.verified = true;

  -- Get manager ID of the mess
  SELECT manager_id INTO v_manager_id FROM public.messes WHERE id = p_mess_id;

  -- Build the final summary JSON
  v_summary := jsonb_build_object(
    'totalExpenses', v_total_expenses,
    'totalDeposits', v_total_deposits,
    'totalFixed', v_total_fixed,
    'totalMeals', v_total_meals,
    'mealRate', v_meal_rate,
    'financeMembersCount', v_member_count,
    'balances', v_balances,
    'fixedCosts', v_fixed_costs,
    'dailyExpenses', v_daily_expenses,
    'dailyMeals', v_daily_meals,
    'dailyDeposits', v_daily_deposits
  );

  -- Insert or update
  INSERT INTO public.monthly_reports (mess_id, month, generated_by, summary, generated_at)
  VALUES (p_mess_id, p_month, v_manager_id, v_summary, now())
  ON CONFLICT (mess_id, month)
  DO UPDATE SET
    generated_by = EXCLUDED.generated_by,
    summary = EXCLUDED.summary,
    generated_at = now();
END;
$$;
`

async function run() {
  console.log('Creating generate_monthly_report function in Neon...')
  await sql.query(GENERATE_REPORT_FN)
  console.log('✅ Function created successfully!')

  console.log('Testing generate_monthly_report...')
  await sql`SELECT generate_monthly_report('7a65b80f-dd7b-4a6b-8732-56703cda4706'::uuid, '2026-06')`
  console.log('✅ Test report generated successfully!')

  console.log('Checking generated report in DB:')
  const report = await sql`SELECT * FROM monthly_reports WHERE mess_id = '7a65b80f-dd7b-4a6b-8732-56703cda4706'::uuid`
  console.log(JSON.stringify(report, null, 2))
}

run().catch(console.error)
