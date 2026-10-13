-- Allow staff with trades.manage permission to fully manage copy_subscriptions from the backoffice
CREATE POLICY "Staff manage subscriptions"
ON public.copy_subscriptions
FOR ALL
TO authenticated
USING (has_permission(auth.uid(), 'trades.manage'))
WITH CHECK (has_permission(auth.uid(), 'trades.manage'));

-- Also let users update/cancel their own subscription rows (used by client pause toggle in CopyTrading.tsx)
CREATE POLICY "Users update own subscriptions"
ON public.copy_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
