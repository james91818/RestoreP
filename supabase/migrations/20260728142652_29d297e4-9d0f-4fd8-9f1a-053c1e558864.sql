CREATE OR REPLACE VIEW public.v_affiliate_balances AS
WITH cutoff AS (SELECT '2026-06-26'::date AS d),
topups AS (
  SELECT t_1.affiliate_id, COALESCE(sum(t_1.amount_usd), 0::numeric) AS total_topups
  FROM affiliate_topups t_1, cutoff c
  WHERE t_1.sent_at >= c.d
  GROUP BY t_1.affiliate_id
),
ftds AS (
  SELECT a_1.id AS affiliate_id,
    count(p.id) FILTER (WHERE p.shaved_to IS NULL AND p.first_deposit_at IS NOT NULL AND p.first_deposit_at >= (SELECT d FROM cutoff)) AS billable_ftds,
    count(p.id) FILTER (WHERE p.shaved_to IS NOT NULL AND sp.first_deposit_at IS NOT NULL AND sp.first_deposit_at >= (SELECT d FROM cutoff)) AS shaved_ftds,
    COALESCE(sum(d.cpa_usd) FILTER (WHERE p.id IS NOT NULL AND p.shaved_to IS NULL AND p.first_deposit_at IS NOT NULL AND p.first_deposit_at >= (SELECT d FROM cutoff)), 0::numeric) AS spent_usd
  FROM affiliates a_1
    LEFT JOIN affiliate_deals d ON d.affiliate_id = a_1.id AND d.status = 'active'
    LEFT JOIN profiles p ON lower(p.affiliate) = lower(a_1.name)
      AND lower(p.funnel) = lower(d.funnel)
      AND lower(p.country) = lower(d.country)
    LEFT JOIN profiles sp ON sp.id = p.shaved_to
  GROUP BY a_1.id
)
SELECT a.id AS affiliate_id,
  a.name AS affiliate_name,
  COALESCE(t.total_topups, 0::numeric) AS total_topups,
  COALESCE(f.billable_ftds, 0::bigint)::integer AS billable_ftds,
  COALESCE(f.shaved_ftds, 0::bigint)::integer AS shaved_ftds,
  COALESCE(f.spent_usd, 0::numeric) AS spent_usd,
  COALESCE(t.total_topups, 0::numeric) - COALESCE(f.spent_usd, 0::numeric) AS balance_usd,
  CASE WHEN (COALESCE(f.billable_ftds, 0::bigint) + COALESCE(f.shaved_ftds, 0::bigint)) > 0
    THEN COALESCE(t.total_topups, 0::numeric) / (COALESCE(f.billable_ftds, 0::bigint) + COALESCE(f.shaved_ftds, 0::bigint))::numeric END AS cpa_before_shave,
  CASE WHEN COALESCE(f.billable_ftds, 0::bigint) > 0
    THEN COALESCE(t.total_topups, 0::numeric) / COALESCE(f.billable_ftds, 0::bigint)::numeric END AS cpa_after_shave
FROM affiliates a
  LEFT JOIN topups t ON t.affiliate_id = a.id
  LEFT JOIN ftds f ON f.affiliate_id = a.id;