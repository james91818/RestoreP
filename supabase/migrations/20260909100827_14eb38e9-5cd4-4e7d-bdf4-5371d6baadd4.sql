
CREATE TABLE public.signup_ip_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_signup_ip_log_ip ON public.signup_ip_log (ip);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.signup_ip_log TO authenticated;
GRANT ALL ON public.signup_ip_log TO service_role;

ALTER TABLE public.signup_ip_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage signup ip log"
ON public.signup_ip_log FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(), 'Admin'))
WITH CHECK (public.has_role_by_name(auth.uid(), 'Admin'));
