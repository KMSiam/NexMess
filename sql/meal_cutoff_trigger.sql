-- =====================================================================
-- Meal cut-off enforcement (Asia/Dhaka)
--   Lunch  cut-off: 10:00
--   Dinner cut-off: 16:00
--
-- Rejects INSERT/UPDATE on `meals` for *today* if the relevant cut-off
-- has passed AND the relevant field actually changed.
--   - Past dates are blocked at the policy/app layer (untouched here).
--   - Future dates are always allowed.
--
-- Manager bypass: callers who set the GUC
--   SELECT set_config('app.bypass_meal_cutoff', 'on', true);
-- in the same transaction are exempt. Use this from a SECURITY DEFINER
-- RPC that first verifies the caller is a manager of the mess.
-- =====================================================================

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
  -- Manager override
  IF bypass = 'on' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Cut-off only applies to *today*
  IF NEW.date <> dhaka_today THEN
    RETURN NEW;
  END IF;

  -- Did each field change?
  IF TG_OP = 'INSERT' THEN
    lunch_changed   := COALESCE(NEW.lunch, false) <> false;
    dinner_changed  := COALESCE(NEW.dinner, false) <> false;
    glunch_changed  := COALESCE(NEW.guest_lunch, 0) <> 0;
    gdinner_changed := COALESCE(NEW.guest_dinner, 0) <> 0;
  ELSE -- UPDATE
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
$$;

DROP TRIGGER IF EXISTS meals_enforce_cutoff ON public.meals;
CREATE TRIGGER meals_enforce_cutoff
BEFORE INSERT OR UPDATE ON public.meals
FOR EACH ROW EXECUTE FUNCTION public.enforce_meal_cutoff();

-- =====================================================================
-- Optional: manager override RPC.
-- Call this from the client when the manager is correcting a member's
-- meal after cut-off. It verifies caller is a manager of the mess,
-- enables the bypass GUC for this transaction, then upserts.
-- =====================================================================

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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_manager boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM mess_members
    WHERE mess_id = p_mess_id
      AND user_id = auth.uid()
      AND role    = 'manager'
      AND status  = 'approved'
  ) INTO is_manager;

  IF NOT is_manager THEN
    RAISE EXCEPTION 'Only managers can override meal cut-off'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  PERFORM set_config('app.bypass_meal_cutoff', 'on', true);

  INSERT INTO meals (user_id, mess_id, date, lunch, dinner, guest_lunch, guest_dinner)
  VALUES (p_user_id, p_mess_id, p_date, p_lunch, p_dinner, p_guest_lunch, p_guest_dinner)
  ON CONFLICT (user_id, mess_id, date)
  DO UPDATE SET
    lunch        = EXCLUDED.lunch,
    dinner       = EXCLUDED.dinner,
    guest_lunch  = EXCLUDED.guest_lunch,
    guest_dinner = EXCLUDED.guest_dinner;
END;
$$;

GRANT EXECUTE ON FUNCTION public.manager_upsert_meal(uuid, uuid, date, boolean, boolean, int, int) TO authenticated;
