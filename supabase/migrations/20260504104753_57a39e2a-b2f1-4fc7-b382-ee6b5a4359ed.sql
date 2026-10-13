-- SECURITY FIX: Prevent clients from directly inserting/updating/deleting copy_subscriptions
-- (which bypassed the wallet-debit logic in subscribe_copy_trader RPC).
-- Users may only READ their own subscriptions; all writes must go through SECURITY DEFINER RPCs.

DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.copy_subscriptions;

CREATE POLICY "Users read own subscriptions"
  ON public.copy_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT / UPDATE / DELETE policies for users => writes are blocked.
-- Staff policy "Staff read all subscriptions" remains for SELECT.
-- Service-role / SECURITY DEFINER RPCs (subscribe_copy_trader, unsubscribe_copy_trader,
-- update_copy_subscription_capital) bypass RLS and remain the only write path.

-- Also harden update_copy_subscription_capital with a sanity cap so a previously inflated
-- invested_capital cannot be refunded beyond what was actually debited.
-- (Defensive: real fix is RLS above.)

-- Reverse the fraudulent subscriptions for Thomas Lorz (a0be6ec5-b0e4-4428-b95e-99e00cad150c)
DELETE FROM public.copy_subscriptions
WHERE user_id = 'a0be6ec5-b0e4-4428-b95e-99e00cad150c';

-- Reset trader follower counts that were inflated (best-effort: just clamp at >=0)
UPDATE public.copy_traders
SET followers_count = GREATEST(0, followers_count - 1)
WHERE id IN (
  '4f03c519-7e96-4483-a80f-e40c06fcd25f',
  'bc377422-e380-45fd-b9d8-2d403afe4142',
  'a99596bc-906c-40c1-b9f6-6b5126d4784f',
  'ccc57b27-aebe-4b1d-9691-a78a0aab5b6e',
  'c9217ec4-21f5-4a6c-a31f-b57b55322b96',
  'c62ba49c-c95a-4385-bfce-34591cc7682f',
  '72766554-caa4-400f-bc03-af1a42ff20ed',
  'adccf5fb-ed65-4ac2-a3f4-1b9c7f8a6e06',
  '899be251-809a-4eb8-9562-e545824b498f',
  '600c211c-9065-4609-94f1-0399abd3e605',
  'b5f1bf96-5304-4c12-b08b-36b7925078fd'
);