-- Policy for members to verify their own deposits
DROP POLICY IF EXISTS "Members can verify their own deposits" ON public.deposits;
CREATE POLICY "Members can verify their own deposits"
ON public.deposits
FOR UPDATE
USING (auth.uid() = user_id AND verified = false)
WITH CHECK (auth.uid() = user_id AND verified = true);

-- Function to notify when a deposit is deleted
CREATE OR REPLACE FUNCTION public.notify_deposit_deleted()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, mess_id, type, title, body, is_read, metadata)
    VALUES (
        OLD.user_id, 
        OLD.mess_id, 
        'system', 
        'Deposit Deleted', 
        'A deposit of ৳' || OLD.amount || ' was deleted by a manager.', 
        false, 
        '{}'::jsonb
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function after a deposit is deleted
DROP TRIGGER IF EXISTS deposit_deleted_trigger ON public.deposits;
CREATE TRIGGER deposit_deleted_trigger
AFTER DELETE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.notify_deposit_deleted();
