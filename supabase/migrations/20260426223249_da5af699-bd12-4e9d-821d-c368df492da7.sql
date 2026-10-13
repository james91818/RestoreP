
-- 1. Add invested_capital + last_trade_at columns
ALTER TABLE public.copy_subscriptions
  ADD COLUMN IF NOT EXISTS invested_capital numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_trade_at timestamptz;

-- Backfill: assume existing subs already used "fixed_amount" as their stake
UPDATE public.copy_subscriptions
  SET invested_capital = COALESCE(fixed_amount, 0)
  WHERE invested_capital = 0;

-- 2. Subscribe with atomic wallet debit
CREATE OR REPLACE FUNCTION public.subscribe_copy_trader(
  _trader_id uuid,
  _amount numeric,
  _mode text DEFAULT 'auto'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _balance numeric;
  _sub_id uuid;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount < 50 THEN RAISE EXCEPTION 'Minimum investment is €50'; END IF;

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

  -- Debit
  UPDATE public.wallets
    SET balance = balance - _amount, updated_at = now()
    WHERE user_id = _user AND currency = 'EUR';

  -- Create subscription
  INSERT INTO public.copy_subscriptions (user_id, trader_id, mode, fixed_amount, invested_capital, is_active)
    VALUES (_user, _trader_id, _mode, _amount, _amount, true)
    RETURNING id INTO _sub_id;

  -- Bump trader followers
  UPDATE public.copy_traders
    SET followers_count = followers_count + 1
    WHERE id = _trader_id;

  RETURN _sub_id;
END;
$$;

-- 3. Unsubscribe with capital refund
CREATE OR REPLACE FUNCTION public.unsubscribe_copy_trader(_subscription_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _sub record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _sub FROM public.copy_subscriptions
    WHERE id = _subscription_id AND user_id = _user FOR UPDATE;
  IF _sub IS NULL THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  -- Refund remaining invested capital
  IF _sub.invested_capital > 0 THEN
    INSERT INTO public.wallets (user_id, currency, balance)
      VALUES (_user, 'EUR', _sub.invested_capital)
      ON CONFLICT (user_id, currency)
      DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = now();
  END IF;

  -- Decrement follower count
  UPDATE public.copy_traders
    SET followers_count = GREATEST(0, followers_count - 1)
    WHERE id = _sub.trader_id;

  DELETE FROM public.copy_subscriptions WHERE id = _subscription_id;
END;
$$;

-- 4. Update invested capital (top-up / reduce)
CREATE OR REPLACE FUNCTION public.update_copy_subscription_capital(
  _subscription_id uuid,
  _new_capital numeric,
  _new_mode text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _sub record;
  _delta numeric;
  _balance numeric;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _new_capital < 50 THEN RAISE EXCEPTION 'Minimum investment is €50'; END IF;

  SELECT * INTO _sub FROM public.copy_subscriptions
    WHERE id = _subscription_id AND user_id = _user FOR UPDATE;
  IF _sub IS NULL THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  _delta := _new_capital - _sub.invested_capital;

  IF _delta > 0 THEN
    -- Need to debit wallet
    SELECT balance INTO _balance FROM public.wallets
      WHERE user_id = _user AND currency = 'EUR' FOR UPDATE;
    IF COALESCE(_balance, 0) < _delta THEN
      RAISE EXCEPTION 'Insufficient EUR balance for top-up';
    END IF;
    UPDATE public.wallets SET balance = balance - _delta, updated_at = now()
      WHERE user_id = _user AND currency = 'EUR';
  ELSIF _delta < 0 THEN
    -- Refund difference
    INSERT INTO public.wallets (user_id, currency, balance)
      VALUES (_user, 'EUR', -_delta)
      ON CONFLICT (user_id, currency)
      DO UPDATE SET balance = wallets.balance + EXCLUDED.balance, updated_at = now();
  END IF;

  UPDATE public.copy_subscriptions
    SET invested_capital = _new_capital,
        fixed_amount = _new_capital,
        mode = COALESCE(_new_mode, mode)
    WHERE id = _subscription_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.subscribe_copy_trader(uuid, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unsubscribe_copy_trader(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_copy_subscription_capital(uuid, numeric, text) TO authenticated;

-- 5. Schedule the auto engine every 5 minutes
SELECT cron.unschedule('copy-trading-engine') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'copy-trading-engine'
);

SELECT cron.schedule(
  'copy-trading-engine',
  '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/copy-trading-engine',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);
