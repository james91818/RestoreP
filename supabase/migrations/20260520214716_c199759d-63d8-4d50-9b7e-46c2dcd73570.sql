-- Add scheduling column for copy-trading engine
ALTER TABLE public.copy_subscriptions
  ADD COLUMN IF NOT EXISTS next_trade_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_copy_subscriptions_next_trade_at
  ON public.copy_subscriptions(next_trade_at) WHERE is_active = true;

-- Schedule copy-trading-engine to run every minute
DO $$
BEGIN
  PERFORM cron.unschedule('copy-trading-engine-tick');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'copy-trading-engine-tick',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/copy-trading-engine',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    ),
    body := '{}'::jsonb
  );
  $$
);