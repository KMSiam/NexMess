-- =====================================================================
-- AI Market Assistant & Bazaar Reminders Schema
-- =====================================================================

-- 1. AI Chat Messages Table (Shared across each mess)
CREATE TABLE IF NOT EXISTS public.market_chat_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id         uuid        NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  sender_id       uuid                 REFERENCES public.profiles(id) ON DELETE SET NULL,
  text            text        NOT NULL,
  is_ai           boolean     NOT NULL DEFAULT false,
  is_daily_update boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS market_chat_messages_mess_id_idx ON public.market_chat_messages (mess_id);
CREATE INDEX IF NOT EXISTS market_chat_messages_created_at_idx ON public.market_chat_messages (created_at ASC);

ALTER TABLE public.market_chat_messages ENABLE ROW LEVEL SECURITY;

-- Select policy: Approved members of the mess can read chat history
DROP POLICY IF EXISTS "Members can view mess chat messages" ON public.market_chat_messages;
CREATE POLICY "Members can view mess chat messages"
ON public.market_chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = market_chat_messages.mess_id
      AND user_id = auth.uid()
      AND status  = 'approved'
  )
);

-- Insert policy: Approved members can post messages
DROP POLICY IF EXISTS "Members can insert mess chat messages" ON public.market_chat_messages;
CREATE POLICY "Members can insert mess chat messages"
ON public.market_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = market_chat_messages.mess_id
      AND user_id = auth.uid()
      AND status  = 'approved'
  )
  -- Enforce that a user can only claim to be themselves, or system/AI (NULL)
  AND (sender_id = auth.uid() OR sender_id IS NULL)
);


-- 2. Bazaar Reminders Log Table
CREATE TABLE IF NOT EXISTS public.bazaar_reminders_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  mess_id       uuid        NOT NULL REFERENCES public.messes(id) ON DELETE CASCADE,
  assigned_date date        NOT NULL,
  sent_to       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sent_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mess_id, assigned_date)
);

CREATE INDEX IF NOT EXISTS bazaar_reminders_log_mess_id_idx ON public.bazaar_reminders_log (mess_id);

ALTER TABLE public.bazaar_reminders_log ENABLE ROW LEVEL SECURITY;

-- Select policy: Approved members of the mess can read logs
DROP POLICY IF EXISTS "Members can view reminder logs" ON public.bazaar_reminders_log;
CREATE POLICY "Members can view reminder logs"
ON public.bazaar_reminders_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = bazaar_reminders_log.mess_id
      AND user_id = auth.uid()
      AND status  = 'approved'
  )
);

-- Insert policy: Approved members can log reminders
DROP POLICY IF EXISTS "Members can insert reminder logs" ON public.bazaar_reminders_log;
CREATE POLICY "Members can insert reminder logs"
ON public.bazaar_reminders_log FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.mess_members
    WHERE mess_id = bazaar_reminders_log.mess_id
      AND user_id = auth.uid()
      AND status  = 'approved'
  )
);
