-- Crypto wallet requests: agent asks PSP via Telegram for a deposit wallet for a specific client+asset
CREATE TABLE IF NOT EXISTS public.crypto_wallet_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  asset text NOT NULL,           -- BTC | ETH | USDT_TRC20 | USDT_ERC20
  network text,                  -- TRC20, ERC20, Bitcoin, Ethereum, etc.
  exchange text NOT NULL,        -- TradeRepublic | Crypto.com
  status text NOT NULL DEFAULT 'pending',  -- pending | fulfilled
  telegram_message_id bigint,
  wallet_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cwr_status ON public.crypto_wallet_requests (status);
CREATE INDEX IF NOT EXISTS idx_cwr_user ON public.crypto_wallet_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_cwr_agent ON public.crypto_wallet_requests (agent_id);

ALTER TABLE public.crypto_wallet_requests ENABLE ROW LEVEL SECURITY;

-- Staff (anyone with users.manage permission, including agents) can read & create their own requests
CREATE POLICY "Staff can view crypto wallet requests"
ON public.crypto_wallet_requests FOR SELECT
TO authenticated
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
  OR has_role_by_name(auth.uid(), 'Manager Conversion')
  OR has_role_by_name(auth.uid(), 'Manager Retention')
  OR is_agent_like(auth.uid())
);

CREATE POLICY "Staff can create crypto wallet requests"
ON public.crypto_wallet_requests FOR INSERT
TO authenticated
WITH CHECK (
  agent_id = auth.uid() AND (
    has_role_by_name(auth.uid(), 'Admin')
    OR has_role_by_name(auth.uid(), 'Manager')
    OR has_role_by_name(auth.uid(), 'Manager Conversion')
    OR has_role_by_name(auth.uid(), 'Manager Retention')
    OR is_agent_like(auth.uid())
  )
);

CREATE POLICY "Staff can update crypto wallet requests"
ON public.crypto_wallet_requests FOR UPDATE
TO authenticated
USING (
  has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
);

-- Schedule the poller every minute (idempotent)
SELECT cron.unschedule('poll-crypto-wallets') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'poll-crypto-wallets'
);

SELECT cron.schedule(
  'poll-crypto-wallets',
  '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/poll-crypto-wallets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);