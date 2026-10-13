CREATE OR REPLACE FUNCTION public.is_staff_member(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Admin','Manager','Manager Conversion','Manager Retention','Agent','Agent Conversion','Agent Retention')
  )
$$;

DROP POLICY IF EXISTS "Staff can view pending retention" ON public.pending_retention;
DROP POLICY IF EXISTS "Staff can insert pending retention" ON public.pending_retention;
DROP POLICY IF EXISTS "Staff can update pending retention" ON public.pending_retention;
DROP POLICY IF EXISTS "Staff can delete pending retention" ON public.pending_retention;

CREATE POLICY "Staff can view pending retention" ON public.pending_retention
  FOR SELECT TO authenticated USING (public.is_staff_member(auth.uid()));
CREATE POLICY "Staff can insert pending retention" ON public.pending_retention
  FOR INSERT TO authenticated WITH CHECK (public.is_staff_member(auth.uid()));
CREATE POLICY "Staff can update pending retention" ON public.pending_retention
  FOR UPDATE TO authenticated USING (public.is_staff_member(auth.uid())) WITH CHECK (public.is_staff_member(auth.uid()));
CREATE POLICY "Staff can delete pending retention" ON public.pending_retention
  FOR DELETE TO authenticated USING (public.is_staff_member(auth.uid()));

REVOKE ALL ON public.pending_retention FROM anon;