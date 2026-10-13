CREATE POLICY "Users insert own wallets" ON public.wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);