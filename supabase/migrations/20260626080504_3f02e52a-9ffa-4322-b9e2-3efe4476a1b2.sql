
-- Add affiliate budget reset cutoff: only count FTDs and top-ups on/after this date
CREATE OR REPLACE VIEW public.v_affiliate_balances AS
WITH cutoff AS (SELECT DATE '2026-07-31' AS d),
topups AS (
  SELECT t.affiliate_id, COALESCE(SUM(t.amount_usd), 0) AS total_topups
  FROM public.affiliate_topups t, cutoff c
  WHERE t.sent_at >= c.d
  GROUP BY t.affiliate_id
),
ftds AS (
  SELECT a_1.id AS affiliate_id,
    COUNT(*) FILTER (WHERE p.shaved_to IS NULL) AS billable_ftds,
    COUNT(*) FILTER (WHERE p.shaved_to IS NOT NULL) AS shaved_ftds,
    COALESCE(SUM(d.cpa_usd) FILTER (WHERE p.shaved_to IS NULL), 0) AS spent_usd
  FROM public.affiliates a_1
  LEFT JOIN public.affiliate_deals d ON d.affiliate_id = a_1.id AND d.status = 'active'
  LEFT JOIN public.profiles p
    ON lower(p.affiliate) = lower(a_1.name)
   AND lower(p.funnel) = lower(d.funnel)
   AND lower(p.country) = lower(d.country)
   AND p.first_deposit_at IS NOT NULL
   AND p.first_deposit_at >= (SELECT d FROM cutoff)
  GROUP BY a_1.id
)
SELECT a.id AS affiliate_id,
  a.name AS affiliate_name,
  COALESCE(t.total_topups, 0) AS total_topups,
  COALESCE(f.billable_ftds, 0)::int AS billable_ftds,
  COALESCE(f.shaved_ftds, 0)::int AS shaved_ftds,
  COALESCE(f.spent_usd, 0) AS spent_usd,
  COALESCE(t.total_topups, 0) - COALESCE(f.spent_usd, 0) AS balance_usd,
  CASE WHEN (COALESCE(f.billable_ftds,0) + COALESCE(f.shaved_ftds,0)) > 0
       THEN COALESCE(t.total_topups,0) / (COALESCE(f.billable_ftds,0) + COALESCE(f.shaved_ftds,0))::numeric
       ELSE NULL END AS cpa_before_shave,
  CASE WHEN COALESCE(f.billable_ftds,0) > 0
       THEN COALESCE(t.total_topups,0) / COALESCE(f.billable_ftds,0)::numeric
       ELSE NULL END AS cpa_after_shave
FROM public.affiliates a
LEFT JOIN topups t ON t.affiliate_id = a.id
LEFT JOIN ftds f ON f.affiliate_id = a.id;

INSERT INTO public.platform_settings (key, value)
VALUES ('affiliate_budget_reset_at', '"2026-07-31"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
