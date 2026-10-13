-- Allow staff to read email_send_log for clients they can access
CREATE POLICY "Staff read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (
  -- Admins / Managers (non-agent staff with users.manage) see all email logs
  (
    has_permission(auth.uid(), 'users.manage')
    AND NOT is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
  )
  -- Conversion agents see logs for their leads / FTD clients (matched by recipient email)
  OR (
    is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(p.email) = lower(email_send_log.recipient_email)
        AND (
          (p.is_lead = false AND p.ftd_agent = auth.uid())
          OR (p.is_lead = true AND p.assigned_agent = auth.uid())
        )
    )
  )
  -- Regular agents see logs for clients assigned to them
  OR (
    is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE lower(p.email) = lower(email_send_log.recipient_email)
        AND p.assigned_agent = auth.uid()
    )
  )
);
