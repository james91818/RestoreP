
CREATE OR REPLACE FUNCTION public.guard_signup_abuse()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain text;
  v_local text;
  v_pattern text;
  v_recent int;
BEGIN
  IF lower(coalesce(NEW.email,'')) LIKE '%pentest%'
     OR lower(coalesce(NEW.full_name,'')) LIKE '%pentest%' THEN
    RAISE EXCEPTION 'Registrierung nicht erlaubt.';
  END IF;

  IF NEW.email IS NULL OR position('@' in NEW.email) = 0 THEN
    RETURN NEW;
  END IF;

  v_domain := lower(split_part(NEW.email, '@', 2));
  v_local  := lower(split_part(NEW.email, '@', 1));

  IF EXISTS (SELECT 1 FROM public.blocked_email_domains b WHERE b.domain = v_domain) THEN
    RAISE EXCEPTION 'Diese E-Mail-Domain ist nicht erlaubt. Bitte verwenden Sie eine echte E-Mail-Adresse.';
  END IF;

  v_pattern := regexp_replace(v_local, '[0-9]+$', '');
  IF length(v_pattern) >= 2 THEN
    SELECT count(*) INTO v_recent
    FROM public.profiles p
    WHERE p.created_at > now() - interval '10 minutes'
      AND lower(split_part(coalesce(p.email,''), '@', 2)) = v_domain
      AND regexp_replace(lower(split_part(coalesce(p.email,''), '@', 1)), '[0-9]+$', '') = v_pattern;

    IF v_recent >= 3 THEN
      RAISE EXCEPTION 'Zu viele Registrierungen in kurzer Zeit. Bitte versuchen Sie es spaeter erneut.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_signup_abuse() FROM anon, authenticated, public;
