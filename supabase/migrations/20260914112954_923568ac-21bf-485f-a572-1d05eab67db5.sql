CREATE OR REPLACE FUNCTION public.swap_verification_codes(_orig_id uuid, _new_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _orig_code text;
  _new_code text;
  _tmp text;
BEGIN
  SELECT verification_code INTO _orig_code FROM public.profiles WHERE id = _orig_id;
  SELECT verification_code INTO _new_code FROM public.profiles WHERE id = _new_id;
  IF _orig_code IS NULL OR _new_code IS NULL OR _orig_code = _new_code THEN
    RETURN _new_code;
  END IF;

  -- park the original code on a temporary unique value to avoid the UNIQUE clash
  _tmp := 'TMP' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  UPDATE public.profiles SET verification_code = _tmp WHERE id = _orig_id;
  UPDATE public.profiles SET verification_code = _orig_code WHERE id = _new_id;
  UPDATE public.profiles SET verification_code = _new_code WHERE id = _orig_id;

  RETURN _orig_code;
END;
$$;

REVOKE ALL ON FUNCTION public.swap_verification_codes(uuid, uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.swap_verification_codes(uuid, uuid) TO service_role;

-- Backfill: existing shaved pairs keep the original (pre-shave) code on the client-facing profile
DO $do$
DECLARE r record;
BEGIN
  FOR r IN SELECT id AS orig_id, shaved_to AS new_id FROM public.profiles WHERE shaved_to IS NOT NULL LOOP
    PERFORM public.swap_verification_codes(r.orig_id, r.new_id);
  END LOOP;
END
$do$;