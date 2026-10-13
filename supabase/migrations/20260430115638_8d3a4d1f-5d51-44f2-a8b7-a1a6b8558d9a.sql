CREATE POLICY "Manager Retention can read all depositor deposits"
ON public.deposits
FOR SELECT
TO authenticated
USING (
  has_role_by_name(auth.uid(), 'Manager Retention')
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = deposits.user_id
      AND (p.is_lead = false OR p.first_deposit_at IS NOT NULL)
  )
);