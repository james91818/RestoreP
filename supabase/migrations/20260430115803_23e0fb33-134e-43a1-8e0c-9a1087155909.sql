-- Expand Manager Retention access: see deposits for ALL users (leads + depositors)
DROP POLICY IF EXISTS "Manager Retention can read all depositor deposits" ON public.deposits;

CREATE POLICY "Manager Retention can read all deposits"
ON public.deposits
FOR SELECT
TO authenticated
USING (has_role_by_name(auth.uid(), 'Manager Retention'));