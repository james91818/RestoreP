DROP POLICY IF EXISTS "Staff read phone call log" ON public.phone_call_log;

CREATE POLICY "Staff read phone call log"
ON public.phone_call_log
FOR SELECT
USING (
  -- The agent who placed the call always sees their own log entries
  agent_id = auth.uid()
  -- Managers/Admins (non agent-like, non conversion-only) see everything
  OR (has_permission(auth.uid(), 'users.manage') AND NOT is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()))
  -- Conversion agents see logs for their leads + their FTD depositors
  OR (is_conversion_only(auth.uid()) AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = phone_call_log.client_id
      AND ( (p.is_lead = false AND p.ftd_agent = auth.uid())
         OR (p.is_lead = true  AND p.assigned_agent = auth.uid()) )
  ))
  -- Other agent-like roles see logs for clients assigned to them
  OR (is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()) AND EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = phone_call_log.client_id AND p.assigned_agent = auth.uid()
  ))
);