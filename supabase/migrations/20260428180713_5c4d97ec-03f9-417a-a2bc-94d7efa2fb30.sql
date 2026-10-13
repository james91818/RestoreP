DROP POLICY IF EXISTS "Users read own deposits" ON public.deposits;

CREATE POLICY "Users read own deposits"
ON public.deposits
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR (
    has_permission(auth.uid(), 'deposits.manage')
    AND NOT is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
    AND NOT has_role_by_name(auth.uid(), 'Manager Conversion')
    AND NOT has_role_by_name(auth.uid(), 'Manager Retention')
  )
  OR (
    is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = deposits.user_id
        AND (((p.is_lead = false) AND (p.ftd_agent = auth.uid()))
          OR ((p.is_lead = true) AND (p.assigned_agent = auth.uid())))
    )
  )
  OR (
    is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
    )
  )
  OR (
    has_role_by_name(auth.uid(), 'Manager Conversion')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = deposits.user_id
        AND (((p.is_lead = false) AND (p.ftd_agent = auth.uid()))
          OR ((p.is_lead = true) AND (p.assigned_agent = auth.uid())))
    )
  )
  OR (
    has_role_by_name(auth.uid(), 'Manager Retention')
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Users read own withdrawals" ON public.withdrawals;

CREATE POLICY "Users read own withdrawals"
ON public.withdrawals
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_permission(auth.uid(), 'withdrawals.manage')
);