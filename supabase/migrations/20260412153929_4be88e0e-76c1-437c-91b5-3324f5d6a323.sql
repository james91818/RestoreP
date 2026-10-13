CREATE TABLE public.phone_prefixes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '',
  phone_number TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_prefixes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read phone prefixes"
ON public.phone_prefixes
FOR SELECT
TO authenticated
USING (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Admins can manage phone prefixes"
ON public.phone_prefixes
FOR ALL
TO authenticated
USING (has_role_by_name(auth.uid(), 'Admin'))
WITH CHECK (has_role_by_name(auth.uid(), 'Admin'));