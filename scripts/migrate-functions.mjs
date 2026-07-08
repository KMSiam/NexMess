import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

const ENFORCE_CUTOFF_FN = `
CREATE OR REPLACE FUNCTION public.enforce_meal_cutoff()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  dhaka_today    date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  dhaka_hour     int  := EXTRACT(HOUR FROM (now() AT TIME ZONE 'Asia/Dhaka'))::int;
  lunch_cutoff   int  := 10;
  dinner_cutoff  int  := 16;
  bypass         text := current_setting('app.bypass_meal_cutoff', true);
  lunch_changed  boolean;
  dinner_changed boolean;
  glunch_changed boolean;
  gdinner_changed boolean;
BEGIN
  IF bypass = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF NEW.date <> dhaka_today THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    lunch_changed   := COALESCE(NEW.lunch, false) <> false;
    dinner_changed  := COALESCE(NEW.dinner, false) <> false;
    glunch_changed  := COALESCE(NEW.guest_lunch, 0) <> 0;
    gdinner_changed := COALESCE(NEW.guest_dinner, 0) <> 0;
  ELSE
    lunch_changed   := NEW.lunch        IS DISTINCT FROM OLD.lunch;
    dinner_changed  := NEW.dinner       IS DISTINCT FROM OLD.dinner;
    glunch_changed  := NEW.guest_lunch  IS DISTINCT FROM OLD.guest_lunch;
    gdinner_changed := NEW.guest_dinner IS DISTINCT FROM OLD.guest_dinner;
  END IF;

  IF (lunch_changed OR glunch_changed) AND dhaka_hour >= lunch_cutoff THEN
    RAISE EXCEPTION 'Lunch cut-off (10:00 Asia/Dhaka) has passed for %', NEW.date
      USING ERRCODE = 'check_violation', HINT = 'Ask the manager to update on your behalf.';
  END IF;

  IF (dinner_changed OR gdinner_changed) AND dhaka_hour >= dinner_cutoff THEN
    RAISE EXCEPTION 'Dinner cut-off (16:00 Asia/Dhaka) has passed for %', NEW.date
      USING ERRCODE = 'check_violation', HINT = 'Ask the manager to update on your behalf.';
  END IF;

  RETURN NEW;
END;
$$
`

const DROP_TRIGGER = `DROP TRIGGER IF EXISTS meals_enforce_cutoff ON public.meals`

const CREATE_TRIGGER = `
CREATE TRIGGER meals_enforce_cutoff
BEFORE INSERT OR UPDATE ON public.meals
FOR EACH ROW EXECUTE FUNCTION public.enforce_meal_cutoff()
`

const MANAGER_UPSERT_FN = `
CREATE OR REPLACE FUNCTION public.manager_upsert_meal(
  p_user_id      uuid,
  p_mess_id      uuid,
  p_date         date,
  p_lunch        boolean,
  p_dinner       boolean,
  p_guest_lunch  int DEFAULT 0,
  p_guest_dinner int DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.bypass_meal_cutoff', 'on', true);

  INSERT INTO public.meals (user_id, mess_id, date, lunch, dinner, guest_lunch, guest_dinner)
  VALUES (p_user_id, p_mess_id, p_date, p_lunch, p_dinner, p_guest_lunch, p_guest_dinner)
  ON CONFLICT (user_id, mess_id, date)
  DO UPDATE SET
    lunch        = EXCLUDED.lunch,
    dinner       = EXCLUDED.dinner,
    guest_lunch  = EXCLUDED.guest_lunch,
    guest_dinner = EXCLUDED.guest_dinner;
END;
$$
`

const CALCULATE_BALANCE_FN = `
CREATE OR REPLACE FUNCTION public.calculate_member_balance(
  p_mess_id uuid,
  p_month   text
)
RETURNS TABLE (
  user_id        uuid,
  total_meals    numeric,
  meal_cost      numeric,
  total_deposits numeric,
  balance        numeric
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date date := (p_month || '-01')::date;
  v_end_date   date := (v_start_date + interval '1 month - 1 day')::date;
  v_total_expenses   numeric;
  v_total_mess_meals numeric;
  v_meal_rate        numeric;
  v_fixed_per_member numeric;
  v_member_count     integer;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
  FROM public.expenses
  WHERE mess_id = p_mess_id AND date BETWEEN v_start_date AND v_end_date AND expense_type = 'bazaar';

  SELECT COALESCE(SUM(
    (CASE WHEN lunch THEN 1 ELSE 0 END) +
    (CASE WHEN dinner THEN 1 ELSE 0 END) +
    COALESCE(guest_lunch, 0) +
    COALESCE(guest_dinner, 0)
  ), 0) INTO v_total_mess_meals
  FROM public.meals m
  JOIN public.mess_members mm ON mm.user_id = m.user_id AND mm.mess_id = m.mess_id
  WHERE m.mess_id = p_mess_id AND m.date BETWEEN v_start_date AND v_end_date AND mm.status = 'approved';

  v_meal_rate := CASE WHEN v_total_mess_meals > 0 THEN v_total_expenses / v_total_mess_meals ELSE 0 END;

  SELECT COUNT(*) INTO v_member_count FROM public.mess_members WHERE mess_id = p_mess_id AND status = 'approved';

  SELECT COALESCE(SUM(amount), 0) / GREATEST(v_member_count, 1) INTO v_fixed_per_member
  FROM public.fixed_costs WHERE mess_id = p_mess_id AND month = p_month;

  RETURN QUERY
  SELECT
    mm.user_id,
    COALESCE(
      (CASE WHEN m.lunch THEN 1 ELSE 0 END) +
      (CASE WHEN m.dinner THEN 1 ELSE 0 END) +
      COALESCE(m.guest_lunch, 0) +
      COALESCE(m.guest_dinner, 0)
    , 0)::numeric AS total_meals,
    (COALESCE(
      (CASE WHEN m.lunch THEN 1 ELSE 0 END) +
      (CASE WHEN m.dinner THEN 1 ELSE 0 END) +
      COALESCE(m.guest_lunch, 0) +
      COALESCE(m.guest_dinner, 0)
    , 0) * v_meal_rate + v_fixed_per_member)::numeric AS meal_cost,
    COALESCE(SUM(d.amount) FILTER (WHERE d.verified = true), 0)::numeric AS total_deposits,
    (COALESCE(SUM(d.amount) FILTER (WHERE d.verified = true), 0) -
     (COALESCE(
       (CASE WHEN m.lunch THEN 1 ELSE 0 END) +
       (CASE WHEN m.dinner THEN 1 ELSE 0 END) +
       COALESCE(m.guest_lunch, 0) +
       COALESCE(m.guest_dinner, 0)
     , 0) * v_meal_rate + v_fixed_per_member))::numeric AS balance
  FROM public.mess_members mm
  LEFT JOIN (
    SELECT user_id,
      SUM(CASE WHEN lunch THEN 1 ELSE 0 END) AS lunch,
      SUM(CASE WHEN dinner THEN 1 ELSE 0 END) AS dinner,
      SUM(COALESCE(guest_lunch, 0)) AS guest_lunch,
      SUM(COALESCE(guest_dinner, 0)) AS guest_dinner
    FROM public.meals
    WHERE mess_id = p_mess_id AND date BETWEEN v_start_date AND v_end_date
    GROUP BY user_id
  ) m ON m.user_id = mm.user_id
  LEFT JOIN public.deposits d ON d.user_id = mm.user_id AND d.mess_id = p_mess_id
    AND d.date BETWEEN v_start_date AND v_end_date
  WHERE mm.mess_id = p_mess_id AND mm.status = 'approved'
  GROUP BY mm.user_id, m.lunch, m.dinner, m.guest_lunch, m.guest_dinner;
END;
$$
`

async function main() {
  console.log('🔧 Applying database functions and triggers to Neon...\n')

  const steps = [
    ['enforce_meal_cutoff() function', ENFORCE_CUTOFF_FN],
    ['meals_enforce_cutoff trigger (drop)', DROP_TRIGGER],
    ['meals_enforce_cutoff trigger (create)', CREATE_TRIGGER],
    ['manager_upsert_meal() function', MANAGER_UPSERT_FN],
    ['calculate_member_balance() function', CALCULATE_BALANCE_FN],
  ]

  for (const [label, stmt] of steps) {
    try {
      await sql.query(stmt.trim())
      console.log(`  ✅ ${label}`)
    } catch (e) {
      console.error(`  ❌ ${label}: ${e.message.substring(0, 100)}`)
    }
  }

  // Verify
  const fns = await sql`
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    ORDER BY routine_name
  `
  console.log('\n📊 Functions in Neon:')
  for (const f of fns) console.log('  ✓', f.routine_name)

  const triggers = await sql`
    SELECT trigger_name, event_object_table FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  `
  console.log('\n⚡ Triggers:')
  for (const t of triggers) console.log('  ✓', t.trigger_name, 'ON', t.event_object_table)

  console.log('\n✅ All done!')
}

main().catch(err => { console.error(err); process.exit(1) })
