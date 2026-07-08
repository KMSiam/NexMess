import { neon } from '@neondatabase/serverless'

const DATABASE_URL = 'postgresql://neondb_owner:npg_K79BiUmSlIwH@ep-muddy-cherry-aosreyio-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
const sql = neon(DATABASE_URL)

async function run() {
  console.log('Fixing calculate_member_balance function...')
  await sql`
    CREATE OR REPLACE FUNCTION public.calculate_member_balance(p_mess_id uuid, p_month text)
    RETURNS TABLE(user_id uuid, total_meals numeric, meal_cost numeric, total_deposits numeric, balance numeric)
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

      -- Fixed: qualify user_id with table alias to avoid ambiguity
      SELECT COALESCE(SUM(
        (CASE WHEN m.lunch THEN 1 ELSE 0 END) +
        (CASE WHEN m.dinner THEN 1 ELSE 0 END) +
        COALESCE(m.guest_lunch, 0) +
        COALESCE(m.guest_dinner, 0)
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
        -- m.lunch/dinner are already numeric sums from the subquery, use COALESCE directly
        (COALESCE(m.lunch, 0) + COALESCE(m.dinner, 0) +
         COALESCE(m.guest_lunch, 0) + COALESCE(m.guest_dinner, 0))::numeric AS total_meals,
        ((COALESCE(m.lunch, 0) + COALESCE(m.dinner, 0) +
          COALESCE(m.guest_lunch, 0) + COALESCE(m.guest_dinner, 0)) * v_meal_rate
          + v_fixed_per_member)::numeric AS meal_cost,
        COALESCE(SUM(d.amount) FILTER (WHERE d.verified = true), 0)::numeric AS total_deposits,
        (COALESCE(SUM(d.amount) FILTER (WHERE d.verified = true), 0) -
         ((COALESCE(m.lunch, 0) + COALESCE(m.dinner, 0) +
           COALESCE(m.guest_lunch, 0) + COALESCE(m.guest_dinner, 0)) * v_meal_rate
           + v_fixed_per_member))::numeric AS balance
      FROM public.mess_members mm
      LEFT JOIN (
        SELECT meals.user_id,
          SUM(CASE WHEN meals.lunch THEN 1 ELSE 0 END) AS lunch,
          SUM(CASE WHEN meals.dinner THEN 1 ELSE 0 END) AS dinner,
          SUM(COALESCE(meals.guest_lunch, 0)) AS guest_lunch,
          SUM(COALESCE(meals.guest_dinner, 0)) AS guest_dinner
        FROM public.meals
        WHERE meals.mess_id = p_mess_id AND meals.date BETWEEN v_start_date AND v_end_date
        GROUP BY meals.user_id
      ) m ON m.user_id = mm.user_id
      LEFT JOIN public.deposits d ON d.user_id = mm.user_id AND d.mess_id = p_mess_id
        AND d.date BETWEEN v_start_date AND v_end_date
      WHERE mm.mess_id = p_mess_id AND mm.status = 'approved'
      GROUP BY mm.user_id, m.lunch, m.dinner, m.guest_lunch, m.guest_dinner;
    END;
    $$
  `
  console.log('Function updated. Testing...')

  const result = await sql`SELECT * FROM calculate_member_balance('7a65b80f-dd7b-4a6b-8732-56703cda4706'::uuid, '2026-07')`
  console.log('Result:', result)
}

run().catch(console.error)
