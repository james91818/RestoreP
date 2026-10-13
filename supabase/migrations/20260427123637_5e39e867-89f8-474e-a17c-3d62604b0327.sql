DROP POLICY IF EXISTS "Staff insert phone call log" ON public.phone_call_log;

CREATE POLICY "Staff insert phone call log"
ON public.phone_call_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = agent_id
  AND (
    (
      has_permission(auth.uid(), 'users.manage')
      AND NOT is_agent_like(auth.uid())
      AND NOT is_conversion_only(auth.uid())
    )
    OR (
      is_conversion_only(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = phone_call_log.client_id
          AND (
            (p.is_lead = false AND p.ftd_agent = auth.uid())
            OR (p.is_lead = true AND p.assigned_agent = auth.uid())
          )
      )
    )
    OR (
      is_agent_like(auth.uid())
      AND NOT is_conversion_only(auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = phone_call_log.client_id
          AND p.assigned_agent = auth.uid()
      )
    )
  )
);