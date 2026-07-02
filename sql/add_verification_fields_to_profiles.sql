-- Add verification and emergency contact columns to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_doc_type text CONSTRAINT profiles_verification_doc_type_check CHECK (verification_doc_type IN ('nid', 'birth_certificate', 'other')),
ADD COLUMN IF NOT EXISTS verification_doc_no text,
ADD COLUMN IF NOT EXISTS verification_doc_url text,
ADD COLUMN IF NOT EXISTS emergency_contact_no text;
