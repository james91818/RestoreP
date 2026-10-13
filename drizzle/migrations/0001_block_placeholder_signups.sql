CREATE OR REPLACE FUNCTION public.guard_signup_placeholders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pre boolean; _name text; _digits text;
BEGIN
  SELECT COALESCE((raw_app_meta_data->>'pre_approved')::boolean, false) INTO _pre FROM auth.users WHERE id = NEW.id;
  IF COALESCE(_pre, false) THEN RETURN NEW; END IF;
  _name := lower(coalesce(NEW.full_name, ''));
  _digits := regexp_replace(coalesce(NEW.phone, ''), '[^0-9]', '', 'g');
  IF _name ~ '(max\s*(mustermann|mueller|müller)|erika\s*mustermann|john\s*doe|test\s*test)'
     OR _digits ~ '(123456789|987654321|0000000|1111111)' THEN
    RAISE EXCEPTION 'Registrierung nicht erlaubt. Bitte verwenden Sie Ihre echten Daten.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_signup_placeholders ON public.profiles;
CREATE TRIGGER trg_guard_signup_placeholders BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_signup_placeholders();