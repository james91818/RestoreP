CREATE OR REPLACE FUNCTION public.open_trade_atomic(
  p_user_id uuid,
  p_asset_id uuid,
  p_direction text,
  p_size numeric,
  p_entry_price numeric,
  p_leverage integer,
  p_order_type text DEFAULT 'market',
  p_stop_loss numeric DEFAULT NULL,
  p_take_profit numeric DEFAULT NULL
)
RETURNS TABLE(trade_id uuid, entry_price numeric, wallet_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_trade_id uuid;
  v_order_type text;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  IF p_asset_id IS NULL THEN
    RAISE EXCEPTION 'asset_id required';
  END IF;

  IF p_direction NOT IN ('buy', 'sell') THEN
    RAISE EXCEPTION 'invalid direction';
  END IF;

  IF p_size IS NULL OR p_size <= 0 THEN
    RAISE EXCEPTION 'invalid size';
  END IF;

  IF p_entry_price IS NULL OR p_entry_price <= 0 THEN
    RAISE EXCEPTION 'invalid entry price';
  END IF;

  IF p_leverage IS NULL OR p_leverage < 1 THEN
    RAISE EXCEPTION 'invalid leverage';
  END IF;

  v_order_type := COALESCE(NULLIF(trim(p_order_type), ''), 'market');

  SELECT *
  INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
    AND currency = 'EUR'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet not found';
  END IF;

  IF COALESCE(v_wallet.balance, 0) < p_size THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_size,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.trades (
    user_id,
    asset_id,
    direction,
    size,
    entry_price,
    leverage,
    order_type,
    stop_loss,
    take_profit,
    status,
    pnl
  ) VALUES (
    p_user_id,
    p_asset_id,
    p_direction,
    p_size,
    p_entry_price,
    p_leverage,
    v_order_type,
    p_stop_loss,
    p_take_profit,
    'open',
    0
  )
  RETURNING id INTO v_trade_id;

  RETURN QUERY
  SELECT v_trade_id, p_entry_price, (v_wallet.balance - p_size);
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'open_trade_atomic failed for user %, asset %, size %: % (%)', p_user_id, p_asset_id, p_size, SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.open_trade_atomic(uuid, uuid, text, numeric, numeric, integer, text, numeric, numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.open_trade_atomic(uuid, uuid, text, numeric, numeric, integer, text, numeric, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.open_trade_atomic(uuid, uuid, text, numeric, numeric, integer, text, numeric, numeric) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.open_trade_atomic(uuid, uuid, text, numeric, numeric, integer, text, numeric, numeric) TO service_role;