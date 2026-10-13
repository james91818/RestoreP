DROP POLICY IF EXISTS "Staff can read welcome visits" ON public.welcome_page_visits;

CREATE POLICY "Staff can read welcome visits"
ON public.welcome_page_visits
FOR SELECT
TO authenticated
USING (
  public.has_permission(auth.uid(), 'users.manage')
  OR public.is_agent_like(auth.uid())
  OR public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager Conversion')
  OR public.has_role_by_name(auth.uid(), 'Manager Retention')
);