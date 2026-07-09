-- Clean up existing messages beyond the last 20 per mess
DELETE FROM public.market_chat_messages
WHERE id NOT IN (
  SELECT id
  FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY mess_id ORDER BY created_at DESC) as rn
    FROM public.market_chat_messages
  ) t
  WHERE t.rn <= 20
);

-- Create trigger function to auto-prune to 20 messages on new insertions
CREATE OR REPLACE FUNCTION clean_old_market_messages()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.market_chat_messages
  WHERE id IN (
    SELECT id
    FROM public.market_chat_messages
    WHERE mess_id = NEW.mess_id
    ORDER BY created_at DESC
    OFFSET 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger
DROP TRIGGER IF EXISTS tr_clean_old_market_messages ON public.market_chat_messages;
CREATE TRIGGER tr_clean_old_market_messages
AFTER INSERT ON public.market_chat_messages
FOR EACH ROW
EXECUTE FUNCTION clean_old_market_messages();
