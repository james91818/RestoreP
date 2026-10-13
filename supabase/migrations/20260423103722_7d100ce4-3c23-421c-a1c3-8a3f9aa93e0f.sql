-- Backfill close prices for already-closed trades where current_price is null
-- or equals entry_price, so the displayed entry vs close price is consistent
-- with the realized P&L instead of being identical.
UPDATE public.trades
SET current_price = CASE
  WHEN COALESCE(pnl, 0) = 0 OR size = 0 OR leverage = 0 THEN entry_price
  WHEN direction = 'buy' THEN entry_price * (1 + (pnl / (size * leverage)))
  ELSE entry_price * (1 - (pnl / (size * leverage)))
END
WHERE status = 'closed'
  AND (current_price IS NULL OR current_price = entry_price);