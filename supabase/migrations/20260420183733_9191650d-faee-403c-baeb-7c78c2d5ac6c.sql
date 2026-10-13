
-- Helper: true if user has Agent, Agent Conversion, or Agent Retention
CREATE OR REPLACE FUNCTION public.is_agent_like(_user_id uuid)
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
      AND r.name IN ('Agent', 'Agent Conversion', 'Agent Retention')
  )
$$;

-- profiles: agent variants are restricted to assigned leads (same as Agent)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR (has_permission(auth.uid(), 'users.manage') AND NOT public.is_agent_like(auth.uid()))
  OR assigned_agent = auth.uid()
);

-- deposits: agent variants only see deposits of assigned clients
DROP POLICY IF EXISTS "Users read own deposits" ON public.deposits;
CREATE POLICY "Users read own deposits"
ON public.deposits
FOR SELECT
USING (
  auth.uid() = user_id
  OR (has_permission(auth.uid(), 'deposits.manage') AND NOT public.is_agent_like(auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
  )
);

-- platform_settings: read for any staff incl. agent variants
DROP POLICY IF EXISTS "Staff can read platform_settings" ON public.platform_settings;
CREATE POLICY "Staff can read platform_settings"
ON public.platform_settings
FOR SELECT
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
  OR public.is_agent_like(auth.uid())
);

-- payment_link_requests: select / insert / update for staff incl. agent variants
DROP POLICY IF EXISTS "Staff can view payment link requests" ON public.payment_link_requests;
CREATE POLICY "Staff can view payment link requests"
ON public.payment_link_requests
FOR SELECT
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
  OR public.is_agent_like(auth.uid())
);

DROP POLICY IF EXISTS "Staff can create payment link requests" ON public.payment_link_requests;
CREATE POLICY "Staff can create payment link requests"
ON public.payment_link_requests
FOR INSERT
WITH CHECK (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
  OR public.is_agent_like(auth.uid())
);

DROP POLICY IF EXISTS "Staff can update payment link requests" ON public.payment_link_requests;
CREATE POLICY "Staff can update payment link requests"
ON public.payment_link_requests
FOR UPDATE
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
  OR public.is_agent_like(auth.uid())
);

-- payment_link_presets: view
DROP POLICY IF EXISTS "Staff can view payment link presets" ON public.payment_link_presets;
CREATE POLICY "Staff can view payment link presets"
ON public.payment_link_presets
FOR SELECT
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
  OR public.is_agent_like(auth.uid())
);
