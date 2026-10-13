
DROP POLICY IF EXISTS "Admins and Managers can update payment link presets" ON public.payment_link_presets;
CREATE POLICY "Admins and Managers can update payment link presets"
ON public.payment_link_presets
FOR UPDATE
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
);

DROP POLICY IF EXISTS "Admins and Managers can delete payment link presets" ON public.payment_link_presets;
CREATE POLICY "Admins and Managers can delete payment link presets"
ON public.payment_link_presets
FOR DELETE
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
);
