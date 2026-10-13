CREATE OR REPLACE FUNCTION public.guard_signup_placeholders()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _pre boolean; _confirmed boolean; _name text; _digits text;
BEGIN
  SELECT COALESCE((raw_app_meta_data->>'pre_approved')::boolean, false), email_confirmed_at IS NOT NULL
    INTO _pre, _confirmed FROM auth.users WHERE id = NEW.id;
  -- Accounts created by staff/affiliate API are pre-confirmed; only public sign-ups are checked
  IF COALESCE(_pre, false) OR COALESCE(_confirmed, false) OR COALESCE(NEW.created_via_affiliate_api, false) THEN RETURN NEW; END IF;
  _name := lower(coalesce(NEW.full_name, ''));
  _digits := regexp_replace(coalesce(NEW.phone, ''), '[^0-9]', '', 'g');
  IF _name ~ '(max\s*(mustermann|mueller|müller)|erika\s*mustermann|john\s*doe|test\s*test)'
     OR _digits ~ '(123456789|987654321|0000000|1111111)' THEN
    RAISE EXCEPTION 'Registrierung nicht erlaubt. Bitte verwenden Sie Ihre echten Daten.';
  END IF;
  RETURN NEW;
END $function$;