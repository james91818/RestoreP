CREATE OR REPLACE FUNCTION public.set_signup_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _pre boolean;
BEGIN
  SELECT COALESCE((raw_app_meta_data->>'pre_approved')::boolean, false) INTO _pre
  FROM auth.users WHERE id = NEW.id;
  IF COALESCE(_pre, false) OR COALESCE(NEW.created_via_affiliate_api, false) THEN
    NEW.access_approved := true;
  ELSE
    NEW.access_approved := false;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_signup_approval ON public.profiles;
CREATE TRIGGER trg_set_signup_approval BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_signup_approval();

CREATE OR REPLACE FUNCTION public.guard_access_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_permission(auth.uid(), 'users.manage')
     AND NEW.access_approved IS DISTINCT FROM OLD.access_approved THEN
    NEW.access_approved := OLD.access_approved;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_access_approved ON public.profiles;
CREATE TRIGGER trg_guard_access_approved BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_access_approved();