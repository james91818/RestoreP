
-- Add asset-scoping fields to copy_traders so each strategy only trades within its declared focus
ALTER TABLE public.copy_traders
  ADD COLUMN IF NOT EXISTS allowed_asset_types text[] NOT NULL DEFAULT ARRAY['crypto','stock','index','commodity'],
  ADD COLUMN IF NOT EXISTS allowed_symbols text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Per-trader focus, derived from each strategy's description
UPDATE public.copy_traders SET allowed_asset_types = ARRAY['crypto','stock','index','commodity'], allowed_symbols = ARRAY[]::text[] WHERE display_name IN ('George Soros','Michael Saylor');

UPDATE public.copy_traders SET allowed_asset_types = ARRAY['stock'], allowed_symbols = ARRAY[]::text[]
  WHERE display_name IN ('Carsten Maschmeyer','Felix Zulauf','Florian Homm','Cathie Wood','Warren Buffett');

UPDATE public.copy_traders SET allowed_asset_types = ARRAY['commodity','stock'], allowed_symbols = ARRAY[]::text[]
  WHERE display_name = 'Marc Faber';

UPDATE public.copy_traders SET allowed_asset_types = ARRAY['index','stock'], allowed_symbols = ARRAY[]::text[]
  WHERE display_name = 'Dirk Müller';

UPDATE public.copy_traders SET allowed_asset_types = ARRAY['commodity','index','crypto'], allowed_symbols = ARRAY[]::text[]
  WHERE display_name = 'Ray Dalio';

UPDATE public.copy_traders SET allowed_asset_types = ARRAY['stock','crypto'], allowed_symbols = ARRAY[]::text[]
  WHERE display_name = 'Elon Musk';

-- Seed a "Trader AI" automated strategy restricted to the top 10 crypto coins
INSERT INTO public.copy_traders (display_name, description, win_rate, total_pnl, total_trades, followers_count, is_visible, is_admin_managed, allowed_asset_types, allowed_symbols)
SELECT
  'Trader AI',
  'Vollautomatisierter KI-Algorithmus. Handelt ausschließlich die Top 10 Kryptowährungen nach Marktkapitalisierung mit datengetriebener Risikosteuerung.',
  92,
  0,
  0,
  0,
  true,
  true,
  ARRAY['crypto']::text[],
  ARRAY['BTC','ETH','SOL','XRP','BNB','DOGE','ADA','TRX','AVAX','LINK']::text[]
WHERE NOT EXISTS (SELECT 1 FROM public.copy_traders WHERE display_name = 'Trader AI');
