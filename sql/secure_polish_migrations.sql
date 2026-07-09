-- =====================================================================
-- Database Migrations for secure polish fixes.
-- Runs RLS policy improvements, creates verifications bucket and policies.
-- =====================================================================

-- 1. Create a secure private bucket for identity verification docs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('verifications', 'verifications', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Restrict SELECT to the document owner OR a mess manager of their mess
DROP POLICY IF EXISTS "Only owner and managers can view verification docs" ON storage.objects;
CREATE POLICY "Only owner and managers can view verification docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'verifications'
  AND (
    -- Rule A: User is the owner of the document
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Rule B: User is an approved manager of a mess the owner belongs to
    EXISTS (
      SELECT 1 FROM public.mess_members owner_membership
      JOIN public.mess_members caller_membership 
        ON caller_membership.mess_id = owner_membership.mess_id
      WHERE owner_membership.user_id = (storage.foldername(name))[1]::uuid
        AND caller_membership.user_id = auth.uid()
        AND caller_membership.role = 'manager'
        AND caller_membership.status = 'approved'
    )
  )
);

-- 3. Restrict INSERT/UPDATE/DELETE to the document owner only
DROP POLICY IF EXISTS "Users can manage their own verification docs" ON storage.objects;
CREATE POLICY "Users can manage their own verification docs"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Fix RLS on public.deposits table
-- Drop the permissive and broken "Members can verify their own deposits" policy
DROP POLICY IF EXISTS "Members can verify their own deposits" ON public.deposits;

-- Policy for members: Can only modify details of their own deposits while still pending (unverified)
DROP POLICY IF EXISTS "Members can edit pending deposits" ON public.deposits;
CREATE POLICY "Members can edit pending deposits"
ON public.deposits FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  AND verified = false
)
WITH CHECK (
  auth.uid() = user_id 
  AND verified = false -- Prevents members from toggling verified to true
);

-- Policy for managers: Can update any deposit in their mess (to verify or correct it)
DROP POLICY IF EXISTS "Managers can verify and update deposits" ON public.deposits;
CREATE POLICY "Managers can verify and update deposits"
ON public.deposits FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_members.mess_id = deposits.mess_id
      AND mess_members.user_id = auth.uid()
      AND mess_members.role = 'manager'
      AND mess_members.status = 'approved'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_members.mess_id = deposits.mess_id
      AND mess_members.user_id = auth.uid()
      AND mess_members.role = 'manager'
      AND mess_members.status = 'approved'
  )
);

-- 5. Revoke authenticated execute rights on public.archive_monthly_report
REVOKE EXECUTE ON FUNCTION public.archive_monthly_report(uuid, text) FROM public, authenticated;

-- Ensure execute on the manager-validated wrapper is granted
GRANT EXECUTE ON FUNCTION public.generate_monthly_report(uuid, text) TO authenticated;
