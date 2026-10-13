-- 1. Inbound transaction log (dedup source-of-truth)
CREATE TABLE IF NOT EXISTS public.crypto_inbound_tx (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text NOT NULL,
  network text NOT NULL,            -- 'Bitcoin' | 'TRC20' | 'ERC20'
  currency text NOT NULL,           -- 'BTC' | 'USDT'
  address text NOT NULL,
  amount numeric NOT NULL,
  confirmations integer NOT NULL DEFAULT 0,
  user_id uuid,
  deposit_id uuid,
  status text NOT NULL DEFAULT 'detected',  -- 'detected' | 'imported' | 'ignored'
  block_time timestamptz,
  detected_at timestamptz NOT NULL DEFAULT now(),
  raw jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS crypto_inbound_tx_unique
  ON public.crypto_inbound_tx (network, tx_hash, address);
CREATE INDEX IF NOT EXISTS crypto_inbound_tx_user_idx
  ON public.crypto_inbound_tx (user_id, detected_at DESC);

ALTER TABLE public.crypto_inbound_tx ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read crypto inbound tx"
ON public.crypto_inbound_tx FOR SELECT TO authenticated
USING (has_role_by_name(auth.uid(), 'Admin') OR has_role_by_name(auth.uid(), 'Manager'));

-- 2. Link deposits to on-chain tx (for dedup + traceability)
ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS tx_hash text,
  ADD COLUMN IF NOT EXISTS network text;

CREATE UNIQUE INDEX IF NOT EXISTS deposits_tx_hash_unique
  ON public.deposits (network, tx_hash) WHERE tx_hash IS NOT NULL;

-- 3. Polling priority field
ALTER TABLE public.client_crypto_addresses
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

CREATE INDEX IF NOT EXISTS client_crypto_addresses_check_idx
  ON public.client_crypto_addresses (last_checked_at NULLS FIRST);