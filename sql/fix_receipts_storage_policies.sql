-- Fix over-permissive receipts storage policies.
-- Receipt path structure: {mess_id}/{timestamp}.{ext}
-- So (storage.foldername(name))[1] gives the mess_id.
--
-- Before: any authenticated user could upload to or view any receipt.
-- After:  upload restricted to approved managers of that mess;
--         view restricted to approved members of that mess.

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Managers can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Mess members can view receipts"  ON storage.objects;

-- VIEW: approved members of the mess can read its receipts
CREATE POLICY "Mess members can view receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = (storage.foldername(name))[1]::uuid
      AND user_id  = auth.uid()
      AND status   = 'approved'
  )
);

-- UPLOAD: approved managers of the mess can add receipts
CREATE POLICY "Managers can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = (storage.foldername(name))[1]::uuid
      AND user_id  = auth.uid()
      AND role     = 'manager'
      AND status   = 'approved'
  )
);

-- DELETE: managers can remove receipts from their mess
CREATE POLICY "Managers can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = (storage.foldername(name))[1]::uuid
      AND user_id  = auth.uid()
      AND role     = 'manager'
      AND status   = 'approved'
  )
);
