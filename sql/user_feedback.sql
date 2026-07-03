-- Create the user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    email TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users (and authenticated ones) to insert feedback
CREATE POLICY "Allow anonymous and authenticated users to insert feedback" 
ON public.user_feedback 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- No read access policy is created, meaning users cannot read any feedback rows
