-- Create chat-media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for avatars bucket
-- 1. Anyone authenticated can select (view) profiles' avatars
CREATE POLICY "Users can view avatars"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- 2. Users can upload their own avatars. Path structure: {user_id}/{filename}
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 3. Users can update their own avatars
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Users can delete their own avatars
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);


-- Policies for chat-media bucket
-- Path structure: {mess_id}/{filename}
-- 1. SELECT: Approved members of the mess can read its chat media
CREATE POLICY "Mess members can view chat media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = (storage.foldername(name))[1]::uuid
      AND user_id  = auth.uid()
      AND status   = 'approved'
  )
);

-- 2. INSERT: Approved members of the mess can upload chat media
CREATE POLICY "Mess members can upload chat media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = (storage.foldername(name))[1]::uuid
      AND user_id  = auth.uid()
      AND status   = 'approved'
  )
);
