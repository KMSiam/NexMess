-- Create chat_reactions table
CREATE TABLE IF NOT EXISTS public.chat_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- 1. Members of the same mess can view reactions
CREATE POLICY "Users can view reactions in their mess" ON public.chat_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.mess_members mm ON mm.mess_id = m.mess_id
      WHERE m.id = chat_reactions.message_id
      AND mm.user_id = auth.uid()
      AND mm.status = 'approved'
    )
  );

-- 2. Approved members can react to messages in their mess
CREATE POLICY "Users can insert reactions in their mess" ON public.chat_reactions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.chat_messages m
      JOIN public.mess_members mm ON mm.mess_id = m.mess_id
      WHERE m.id = chat_reactions.message_id
      AND mm.user_id = auth.uid()
      AND mm.status = 'approved'
    )
  );

-- 3. Users can remove their own reactions
CREATE POLICY "Users can delete their own reactions" ON public.chat_reactions
  FOR DELETE
  USING (
    auth.uid() = user_id
  );

-- Enable Realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
