CREATE POLICY "Staff delete deposits"
ON public.deposits
FOR DELETE
TO authenticated
USING (has_permission(auth.uid(), 'deposits.manage'));

CREATE POLICY "Staff delete withdrawals"
ON public.withdrawals
FOR DELETE
TO authenticated
USING (has_permission(auth.uid(), 'deposits.manage'));