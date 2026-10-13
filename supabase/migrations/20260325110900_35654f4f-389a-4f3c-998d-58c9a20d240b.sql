
-- Add auto-incrementing display_id to trades table
CREATE SEQUENCE IF NOT EXISTS trades_display_id_seq;

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS display_id integer NOT NULL DEFAULT nextval('trades_display_id_seq');

-- Backfill existing trades with sequential IDs based on opened_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY opened_at) AS rn
  FROM public.trades
  WHERE display_id = 0 OR display_id = nextval('trades_display_id_seq') - currval('trades_display_id_seq')
)
UPDATE public.trades t SET display_id = n.rn FROM numbered n WHERE t.id = n.id;

-- Reset sequence to max + 1
SELECT setval('trades_display_id_seq', COALESCE((SELECT MAX(display_id) FROM public.trades), 0) + 1);
