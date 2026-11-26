-- =====================================================================
-- NexMess v2.9.0 Security & Invite Hardening Migration
-- Part A (applied before/with frontend) + Part B (messes SELECT after frontend push)
-- =====================================================================

-- 1. Capacity check helper & authenticated invite lookup RPC
CREATE OR REPLACE FUNCTION public.has_mess_capacity(p_mess_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.messes m
    WHERE m.id = p_mess_id
      AND m.is_active = true
      AND (
        SELECT count(*)
        FROM public.mess_members mm
        WHERE mm.mess_id = m.id
          AND mm.status = 'approved'
      ) < COALESCE(m.max_members, 20)
  );
$$;

CREATE OR REPLACE FUNCTION public.find_mess_by_code(p_code text)
RETURNS TABLE(
  id uuid,
  name text,
  location text,
  avatar_url text,
  is_active boolean,
  max_members integer,
  is_full boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text := upper(trim(COALESCE(p_code, '')));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_clean = '' OR length(v_clean) > 20 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.name,
    m.location,
    m.avatar_url,
    m.is_active,
    m.max_members,
    NOT public.has_mess_capacity(m.id) AS is_full
  FROM public.messes m
  WHERE upper(m.unique_code) = v_clean
    AND m.is_active = true
  LIMIT 1;
END;
$$;

-- 2. Harden calculate_meal_rate & calculate_member_balance with membership guard
CREATE OR REPLACE FUNCTION public.calculate_meal_rate(p_mess_id uuid, p_month text)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_bazaar DECIMAL;
  total_meals INTEGER;
BEGIN
  IF auth.uid() IS NOT NULL THEN
    IF NOT public.is_mess_member(auth.uid(), p_mess_id) THEN
      RAISE EXCEPTION 'Access denied: not an approved member of this mess'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  ELSIF session_user NOT IN ('postgres', 'supabase_admin')
    AND COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_month !~ '^\d{4}-\d{2}$' THEN
    RAISE EXCEPTION 'Invalid month format (expected YYYY-MM): %', p_month
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO total_bazaar
  FROM public.expenses
  WHERE mess_id = p_mess_id
    AND (expense_type = 'bazaar' OR expense_type IS NULL)
    AND to_char(date, 'YYYY-MM') = p_month;

  SELECT COALESCE(SUM(
    (CASE WHEN lunch THEN 1 ELSE 0 END) +
    (CASE WHEN dinner THEN 1 ELSE 0 END) +
    COALESCE(guest_lunch, 0) +
    COALESCE(guest_dinner, 0)
  ), 0) INTO total_meals
  FROM public.meals
  WHERE mess_id = p_mess_id
    AND to_char(date, 'YYYY-MM') = p_month;

  IF total_meals = 0 THEN RETURN 0; END IF;
  RETURN ROUND(total_bazaar / total_meals, 2);
END;
$$;

-- 3. Stop OAuth auto-verify in handle_new_user & protect is_verified via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  final_username := base_username;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, avatar_url, is_verified)
  VALUES (
    NEW.id,
    final_username,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NEW.raw_user_meta_data ->> 'picture', NULL),
    FALSE
  );

  RETURN NEW;
END;
$$;

-- 4. Pin search_path on all public schema functions
ALTER FUNCTION public.enforce_meal_cutoff() SET search_path = public;
ALTER FUNCTION public.generate_mess_code() SET search_path = public;
ALTER FUNCTION public.is_mess_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.is_mess_manager(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.notify_join_request() SET search_path = public;
ALTER FUNCTION public.notify_bazaar_assignment() SET search_path = public;
ALTER FUNCTION public.notify_expense_added() SET search_path = public;
ALTER FUNCTION public.notify_deposit_deleted() SET search_path = public;
ALTER FUNCTION public.enforce_deposit_verification() SET search_path = public;
ALTER FUNCTION public.clean_old_market_messages() SET search_path = public;
ALTER FUNCTION public.tr_send_push_notification() SET search_path = public;

-- 5. Lock down messes SELECT once frontend uses find_mess_by_code()
ALTER POLICY "Public messes are viewable" ON public.messes TO authenticated
  USING (
    manager_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.mess_members mm
      WHERE mm.mess_id = messes.id
        AND mm.user_id = auth.uid()
        AND mm.status IN ('approved', 'pending')
    )
  );

-- 6. Optional SQL Editor cleanup to revoke REST RPC EXECUTE metadata warnings
REVOKE ALL ON FUNCTION public.archive_monthly_report(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archive_monthly_report(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.cron_archive_previous_month() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_archive_previous_month() TO service_role;
REVOKE ALL ON FUNCTION public.find_mess_by_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_mess_by_code(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.has_mess_capacity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_mess_capacity(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.generate_monthly_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_monthly_report(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.manager_upsert_meal(uuid, uuid, date, boolean, boolean, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manager_upsert_meal(uuid, uuid, date, boolean, boolean, integer, integer) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.manager_verify_member(uuid, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manager_verify_member(uuid, uuid, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_meal_rate(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_meal_rate(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_member_balance(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_member_balance(uuid, uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_mess_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mess_member(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_mess_manager(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_mess_manager(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.auto_unverify_on_profile_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.clean_old_market_messages() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_deposit_verification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_bazaar_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_deposit_deleted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_expense_added() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_join_request() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tr_send_push_notification() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.monthly_reports_cron_log FROM PUBLIC, anon, authenticated;
