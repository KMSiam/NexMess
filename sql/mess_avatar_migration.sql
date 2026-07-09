-- =====================================================================
-- Database Migrations for Mess Avatar Feature.
-- Adds avatar_url to public.messes and adds storage policies to avatars bucket.
-- =====================================================================

-- 1. Add avatar_url column to public.messes
ALTER TABLE public.messes ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. Add storage object policy for managers to upload mess avatars
-- Folder path prefix: mess-{messId}
DROP POLICY IF EXISTS "Mess managers can manage mess avatars" ON storage.objects;
CREATE POLICY "Mess managers can manage mess avatars"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] LIKE 'mess-%'
  AND EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = SUBSTRING((storage.foldername(name))[1] FROM 6)::uuid
      AND user_id = auth.uid()
      AND role    = 'manager'
      AND status  = 'approved'
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] LIKE 'mess-%'
  AND EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = SUBSTRING((storage.foldername(name))[1] FROM 6)::uuid
      AND user_id = auth.uid()
      AND role    = 'manager'
      AND status  = 'approved'
  )
);
