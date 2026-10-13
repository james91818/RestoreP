
CREATE TABLE public.phone_prefix_roles (
  prefix_id uuid NOT NULL REFERENCES public.phone_prefixes(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  PRIMARY KEY (prefix_id, role_id)
);

ALTER TABLE public.phone_prefix_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage phone_prefix_roles"
  ON public.phone_prefix_roles FOR ALL
  TO authenticated
  USING (has_role_by_name(auth.uid(), 'Admin'::text))
  WITH CHECK (has_role_by_name(auth.uid(), 'Admin'::text));

CREATE POLICY "Staff can read phone_prefix_roles"
  ON public.phone_prefix_roles FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'::text));
