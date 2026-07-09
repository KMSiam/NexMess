-- =====================================================================
-- Database Migrations for Member Deposit Confirmation Flow.
-- Allows members to confirm their own deposits, but restricts them from
-- modifying other fields (amount, date, user_id, mess_id) using a trigger.
-- =====================================================================

-- 1. Create or replace trigger function to restrict member updates
CREATE OR REPLACE FUNCTION public.enforce_deposit_verification()
RETURNS trigger AS $$
BEGIN
  -- Check if the current user is a manager of this mess
  IF NOT EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_members.mess_id = OLD.mess_id
      AND mess_members.user_id = auth.uid()
      AND mess_members.role = 'manager'
      AND mess_members.status = 'approved'
  ) THEN
    -- If not a manager, they are a regular member.
    -- They can ONLY verify a deposit (false -> true). They cannot unverify.
    IF OLD.verified = true AND NEW.verified = false THEN
      RAISE EXCEPTION 'Verified deposits cannot be unverified by members.';
    END IF;

    -- They must NOT alter critical deposit details
    IF OLD.amount IS DISTINCT FROM NEW.amount OR
       OLD.user_id IS DISTINCT FROM NEW.user_id OR
       OLD.mess_id IS DISTINCT FROM NEW.mess_id OR
       OLD.date IS DISTINCT FROM NEW.date THEN
      RAISE EXCEPTION 'Members can only confirm deposits, not edit their details.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to deposits table
DROP TRIGGER IF EXISTS tr_enforce_deposit_verification ON public.deposits;
CREATE TRIGGER tr_enforce_deposit_verification
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_deposit_verification();

-- 3. Update RLS policies on deposits
-- Drop the restrictive pending-only policy
DROP POLICY IF EXISTS "Members can edit pending deposits" ON public.deposits;
DROP POLICY IF EXISTS "Members can confirm their own deposits" ON public.deposits;

-- Create a policy allowing members to perform updates on their own deposits
CREATE POLICY "Members can confirm their own deposits"
ON public.deposits FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);
