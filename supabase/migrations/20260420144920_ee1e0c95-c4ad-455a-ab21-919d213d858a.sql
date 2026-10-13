-- Allow staff with trades.manage permission (Admins/Managers/Agents) to insert trades for any user,
-- including pre-closed historical trades created from the back-office bulk creator.
CREATE POLICY "Staff insert trades"
ON public.trades
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_permission(auth.uid(), 'trades.manage')
);
