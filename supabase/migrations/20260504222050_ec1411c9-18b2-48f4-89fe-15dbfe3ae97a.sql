-- Remove client trade insert/update policies — all trade execution must go through edge function
DROP POLICY IF EXISTS "Users insert trades" ON public.trades;
DROP POLICY IF EXISTS "Users update own open trades" ON public.trades;

-- Replace wallet update policy: clients may only DECREASE balance (admin/edge function uses service role)
DROP POLICY IF EXISTS "Users update own wallets" ON public.wallets;
CREATE POLICY "Users can only decrease own wallet"
ON public.wallets
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND balance <= (SELECT w.balance FROM public.wallets w WHERE w.id = wallets.id));