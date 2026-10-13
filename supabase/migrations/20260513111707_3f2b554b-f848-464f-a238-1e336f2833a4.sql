
-- Tier-based daily trade limits, admin-editable
CREATE TABLE IF NOT EXISTS public.tier_trade_limits (
  tier text PRIMARY KEY,
  daily_trade_limit integer,
  daily_copy_trade_limit integer,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tier_trade_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read tier limits"
  ON public.tier_trade_limits
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff manage tier limits"
  ON public.tier_trade_limits
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'users.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'users.manage'));

CREATE TRIGGER update_tier_trade_limits_updated_at
  BEFORE UPDATE ON public.tier_trade_limits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults
INSERT INTO public.tier_trade_limits (tier, daily_trade_limit, daily_copy_trade_limit) VALUES
  ('Basic', 3, 1),
  ('Starter Plan', 1, 1),
  ('Diversifikation', 1, NULL),
  ('Erweiterter Plan', 1, NULL),
  ('Professional', 1, NULL),
  ('Legacy Wealth Strategie', 1, NULL),
  ('Millionaire Club', 1, NULL)
ON CONFLICT (tier) DO NOTHING;

-- Update subscribe_copy_trader to enforce daily copy-trade limit per user's tier
CREATE OR REPLACE FUNCTION public.subscribe_copy_trader(_trader_id uuid, _amount numeric, _mode text DEFAULT 'auto'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _balance numeric;
  _sub_id uuid;
  _tier text;
  _limit integer;
  _today_count integer;
  _stored text;
  _bal_tier text;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 50 THEN RAISE EXCEPTION 'Minimum investment is €50'; END IF;

  -- Resolve effective tier (stored OR computed by balance, whichever is higher)
  SELECT account_type INTO _stored FROM public.profiles WHERE id = _user;
  _stored := COALESCE(_stored, 'Basic');
  -- normalize aliases
  _stored := CASE _stored
    WHEN 'Starter' THEN 'Starter Plan'
    WHEN 'Erweitert' THEN 'Erweiterter Plan'
    WHEN 'Legacy Wealth' THEN 'Legacy Wealth Strategie'
    WHEN 'Legacy' THEN 'Legacy Wealth Strategie'
    WHEN 'Millionaire' THEN 'Millionaire Club'
    ELSE _stored
  END;

  SELECT balance INTO _balance FROM public.wallets WHERE user_id = _user AND currency = 'EUR';
  _balance := COALESCE(_balance, 0);
  _bal_tier := CASE
    WHEN _balance >= 1000000 THEN 'Millionaire Club'
    WHEN _balance >= 200000  THEN 'Legacy Wealth Strategie'
    WHEN _balance >= 100000  THEN 'Professional'
    WHEN _balance >= 50000   THEN 'Erweiterter Plan'
    WHEN _balance >= 25000   THEN 'Diversifikation'
    WHEN _balance >= 10000   THEN 'Starter Plan'
    ELSE 'Basic'
  END;
  -- pick higher of stored/balance tier
  _tier := CASE
    WHEN array_position(ARRAY['Basic','Starter Plan','Diversifikation','Erweiterter Plan','Professional','Legacy Wealth Strategie','Millionaire Club'], _bal_tier)
       > array_position(ARRAY['Basic','Starter Plan','Diversifikation','Erweiterter Plan','Professional','Legacy Wealth Strategie','Millionaire Club'], _stored)
    THEN _bal_tier ELSE _stored
  END;

  SELECT daily_copy_trade_limit INTO _limit FROM public.tier_trade_limits WHERE tier = _tier;

  IF _limit IS NOT NULL THEN
    SELECT count(*) INTO _today_count
    FROM public.copy_subscriptions
    WHERE user_id = _user AND created_at >= date_trunc('day', now() at time zone 'UTC');
    IF _today_count >= _limit THEN
      RAISE EXCEPTION 'COPY_TRADE_LIMIT_REACHED:%:%', _tier, _limit;
    END IF;
  END IF;

  -- Reject duplicate subscription
  IF EXISTS (SELECT 1 FROM public.copy_subscriptions WHERE user_id = _user AND trader_id = _trader_id) THEN
    RAISE EXCEPTION 'You are already copying this trader';
  END IF;

  -- Lock and check wallet
  SELECT balance INTO _balance FROM public.wallets
    WHERE user_id = _user AND currency = 'EUR' FOR UPDATE;
  IF _balance IS NULL OR _balance < _amount THEN
    RAISE EXCEPTION 'Insufficient EUR balance. Need €% but have €%', _amount, COALESCE(_balance, 0);
  END IF;

  UPDATE public.wallets
    SET balance = balance - _amount, updated_at = now()
    WHERE user_id = _user AND currency = 'EUR';

  INSERT INTO public.copy_subscriptions (user_id, trader_id, mode, fixed_amount, invested_capital, is_active)
    VALUES (_user, _trader_id, _mode, _amount, _amount, true)
    RETURNING id INTO _sub_id;

  UPDATE public.copy_traders
    SET followers_count = followers_count + 1
    WHERE id = _trader_id;

  RETURN _sub_id;
END;
$function$;
