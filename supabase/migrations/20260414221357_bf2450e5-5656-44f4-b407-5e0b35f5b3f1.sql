
-- Add verification_code column
ALTER TABLE public.profiles
ADD COLUMN verification_code text UNIQUE;

-- Function to generate random 5-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..5 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill existing profiles
UPDATE public.profiles
SET verification_code = public.generate_verification_code()
WHERE verification_code IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.profiles
ALTER COLUMN verification_code SET DEFAULT public.generate_verification_code(),
ALTER COLUMN verification_code SET NOT NULL;
