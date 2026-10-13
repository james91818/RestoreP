
-- Helper: identify agents who should be limited to assigned leads only
-- (Agent, Agent Conversion, Agent Retention — anyone "agent-like")
-- is_agent_like already exists. We rely on it for agent restrictions.

-- PROFILES: Agent Retention (and other agent roles) only see assigned leads
-- Managers & Admin still see all
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

-- Staff update profiles: agents can only update their assigned leads
DROP POLICY IF EXISTS "Staff update profiles" ON public.profiles;
CREATE POLICY "Staff update profiles" ON public.profiles
FOR UPDATE
USING (
  has_permission(auth.uid(), 'users.manage')
  AND (
    (NOT is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()))
    OR assigned_agent = auth.uid()
  )
)
WITH CHECK (
  has_permission(auth.uid(), 'users.manage')
  AND (
    (NOT is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()))
    OR assigned_agent = auth.uid()
  )
);

-- DEPOSITS: Agent Retention only sees deposits for assigned leads
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
