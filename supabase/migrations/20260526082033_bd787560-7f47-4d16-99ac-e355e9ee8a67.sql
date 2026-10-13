
-- 1. Yield range per tier (drives both AccountTypes display and copy-trading engine)
ALTER TABLE public.tier_trade_limits
  ADD COLUMN IF NOT EXISTS yield_min_pct numeric,
  ADD COLUMN IF NOT EXISTS yield_max_pct numeric;

-- Seed / sync values that currently live hardcoded in AccountTypes.tsx and the engine
INSERT INTO public.tier_trade_limits (tier, yield_min_pct, yield_max_pct) VALUES
  ('Basic',                    8,  10),
  ('Starter Plan',             10, 12),
  ('Diversifikation',          11, 14),
  ('Erweiterter Plan',         12, 15),
  ('Professional',             14, 18),
  ('Legacy Wealth Strategie',  16, 22),
  ('Family Office',            17, 23),
  ('Millionaire Club',         18, 25)
ON CONFLICT (tier) DO UPDATE
  SET yield_min_pct = COALESCE(public.tier_trade_limits.yield_min_pct, EXCLUDED.yield_min_pct),
      yield_max_pct = COALESCE(public.tier_trade_limits.yield_max_pct, EXCLUDED.yield_max_pct);

-- 2. Crypto-Börse house copy trader — official bot
INSERT INTO public.copy_traders (
  display_name, description, avatar_url,
  win_rate, total_pnl, total_trades, followers_count,
  is_visible, is_admin_managed,
  allowed_asset_types, allowed_symbols
)
SELECT
  'Crypto-Börse',
  'Der hauseigene Auto-Trader von Crypto-Börse. Diszipliniertes Multi-Asset-Trading über Krypto, Aktien, Indizes und Rohstoffe — abgestimmt auf Ihren Kontotyp und die in den Kontotypen versprochenen Renditen.',
  NULL,
  86.5,
  3120580.42,
  2480,
  21450,
  true,
  true,
  ARRAY['crypto','stock','index','commodity']::text[],
  ARRAY[]::text[]
WHERE NOT EXISTS (
  SELECT 1 FROM public.copy_traders WHERE display_name = 'Crypto-Börse'
);
