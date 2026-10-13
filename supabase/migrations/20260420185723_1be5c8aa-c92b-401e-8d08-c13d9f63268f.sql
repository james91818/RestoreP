
-- Helper: identify "Conversion" staff who should be limited to assigned leads only
CREATE OR REPLACE FUNCTION public.is_conversion_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Agent Conversion', 'Manager Conversion')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Admin', 'Manager', 'Manager Retention', 'Agent', 'Agent Retention')
  )
$$;

-- PROFILES: restrict Conversion staff to only their assigned leads
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR (
    has_permission(auth.uid(), 'users.manage')
    AND NOT is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
  )
  OR assigned_agent = auth.uid()
);

DROP POLICY IF EXISTS "Staff update profiles" ON public.profiles;
CREATE POLICY "Staff update profiles" ON public.profiles
FOR UPDATE
USING (
  has_permission(auth.uid(), 'users.manage')
  AND (NOT is_conversion_only(auth.uid()) OR assigned_agent = auth.uid())
)
WITH CHECK (
  has_permission(auth.uid(), 'users.manage')
  AND (NOT is_conversion_only(auth.uid()) OR assigned_agent = auth.uid())
);

-- DEPOSITS: same restriction so Conversion only sees their depositors' deposits
DROP POLICY IF EXISTS "Users read own deposits" ON public.deposits;
CREATE POLICY "Users read own deposits" ON public.deposits
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    has_permission(auth.uid(), 'deposits.manage')
    AND NOT is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
  )
);
