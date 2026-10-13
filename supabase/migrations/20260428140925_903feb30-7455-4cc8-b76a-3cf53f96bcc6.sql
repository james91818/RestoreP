-- Broaden SELECT on phone_call_log so any staff member who can see the client
-- (admin, manager, assigned agent, ftd agent) can also see the call history
-- placed to that client by ANY agent — not only their own calls.

DROP POLICY IF EXISTS "Staff read phone call log" ON public.phone_call_log;

CREATE POLICY "Staff read phone call log"
ON public.phone_call_log
FOR SELECT
TO public
USING (
  -- The agent who placed the call always sees their own entry
  agent_id = auth.uid()
  -- Admins / Managers (non-agent staff with users.manage) see everything
  OR (
    has_permission(auth.uid(), 'users.manage')
    AND NOT is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
  )
  -- Conversion agents see calls to their assigned leads or their FTD clients
  OR (
    is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = phone_call_log.client_id
        AND (
          (p.is_lead = false AND p.ftd_agent = auth.uid())
          OR (p.is_lead = true AND p.assigned_agent = auth.uid())
        )
    )
  )
  -- Regular agents see calls to clients assigned to them (placed by anyone)
  OR (
    is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = phone_call_log.client_id
        AND p.assigned_agent = auth.uid()
    )
  )
);
