CREATE TABLE IF NOT EXISTS public.internal_secrets (key text PRIMARY KEY, value text NOT NULL);
REVOKE ALL ON public.internal_secrets FROM anon, authenticated;
GRANT SELECT ON public.internal_secrets TO service_role;
ALTER TABLE public.internal_secrets ENABLE ROW LEVEL SECURITY;
INSERT INTO public.internal_secrets(key, value) VALUES ('server_signup_key', encode(gen_random_bytes(24),'hex')) ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.guard_signup_placeholders()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _pre boolean; _confirmed boolean; _srv text; _name text; _digits text;
BEGIN
  SELECT COALESCE((raw_app_meta_data->>'pre_approved')::boolean, false), email_confirmed_at IS NOT NULL, raw_user_meta_data->>'server_signup_key'
    INTO _pre, _confirmed, _srv FROM auth.users WHERE id = NEW.id;
  IF COALESCE(_pre, false) OR COALESCE(_confirmed, false) OR COALESCE(NEW.created_via_affiliate_api, false)
     OR (_srv IS NOT NULL AND _srv = (SELECT value FROM public.internal_secrets WHERE key = 'server_signup_key')) THEN
    RETURN NEW;
  END IF;
  _name := lower(coalesce(NEW.full_name, ''));
  _digits := regexp_replace(coalesce(NEW.phone, ''), '[^0-9]', '', 'g');
  IF _name ~ '(max\s*(mustermann|mueller|müller)|erika\s*mustermann|john\s*doe|test\s*test)'
     OR _digits ~ '(123456789|987654321|0000000|1111111)' THEN
    RAISE EXCEPTION 'Registrierung nicht erlaubt. Bitte verwenden Sie Ihre echten Daten.';
  END IF;
  RETURN NEW;
END $function$;