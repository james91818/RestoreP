
CREATE TABLE public.blocked_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_email_domains TO authenticated;
GRANT ALL ON public.blocked_email_domains TO service_role;

ALTER TABLE public.blocked_email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocked domains"
ON public.blocked_email_domains FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(), 'Admin'))
WITH CHECK (public.has_role_by_name(auth.uid(), 'Admin'));

INSERT INTO public.blocked_email_domains (domain, reason) VALUES
  ('hi2.in','abuse: automated fake signups'),
  ('mailinator.com','disposable'),
  ('yopmail.com','disposable'),
  ('guerrillamail.com','disposable'),
  ('sharklasers.com','disposable'),
  ('10minutemail.com','disposable'),
  ('tempmail.com','disposable'),
  ('temp-mail.org','disposable'),
  ('trashmail.com','disposable'),
  ('getnada.com','disposable'),
  ('dispostable.com','disposable'),
  ('maildrop.cc','disposable'),
  ('fakeinbox.com','disposable'),
  ('mohmal.com','disposable'),
  ('emailondeck.com','disposable'),
  ('throwawaymail.com','disposable'),
  ('mintemail.com','disposable'),
  ('spam4.me','disposable'),
  ('grr.la','disposable'),
  ('inboxbear.com','disposable')
ON CONFLICT (domain) DO NOTHING;

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
  IF NEW.email IS NULL OR position('@' in NEW.email) = 0 THEN
    RETURN NEW;
  END IF;

  v_domain := lower(split_part(NEW.email, '@', 2));
  v_local  := lower(split_part(NEW.email, '@', 1));

  IF EXISTS (SELECT 1 FROM public.blocked_email_domains b WHERE b.domain = v_domain) THEN
    RAISE EXCEPTION 'Diese E-Mail-Domain ist nicht erlaubt. Bitte verwenden Sie eine echte E-Mail-Adresse.';
  END IF;

  -- strip trailing digits: pt0, pt1, pt2 -> pt
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

DROP TRIGGER IF EXISTS trg_guard_signup_abuse ON public.profiles;
CREATE TRIGGER trg_guard_signup_abuse
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_signup_abuse();
