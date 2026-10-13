
-- Reset cutoff to today; apply cutoff inside period/weekly/crg functions too
CREATE OR REPLACE VIEW public.v_affiliate_balances AS
WITH cutoff AS (SELECT DATE '2026-06-26' AS d),
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
SELECT a.id AS affiliate_id, a.name AS affiliate_name,
  COALESCE(t.total_topups, 0) AS total_topups,
  COALESCE(f.billable_ftds, 0)::int AS billable_ftds,
  COALESCE(f.shaved_ftds, 0)::int AS shaved_ftds,
  COALESCE(f.spent_usd, 0) AS spent_usd,
  COALESCE(t.total_topups, 0) - COALESCE(f.spent_usd, 0) AS balance_usd,
  CASE WHEN (COALESCE(f.billable_ftds,0) + COALESCE(f.shaved_ftds,0)) > 0
       THEN COALESCE(t.total_topups,0) / (COALESCE(f.billable_ftds,0) + COALESCE(f.shaved_ftds,0))::numeric ELSE NULL END AS cpa_before_shave,
  CASE WHEN COALESCE(f.billable_ftds,0) > 0
       THEN COALESCE(t.total_topups,0) / COALESCE(f.billable_ftds,0)::numeric ELSE NULL END AS cpa_after_shave
FROM public.affiliates a
LEFT JOIN topups t ON t.affiliate_id = a.id
LEFT JOIN ftds f ON f.affiliate_id = a.id;

-- Period stats: enforce cutoff
CREATE OR REPLACE FUNCTION public.affiliate_period_stats(_affiliate_id uuid, _from date, _to date)
 RETURNS TABLE(funnel text, country text, cpa_usd numeric, crg_pct numeric, max_invalid_pct numeric, leads integer, invalids integer, counted_invalids numeric, effective_leads numeric, ftds integer, guaranteed numeric, extra_owed numeric, period_charge numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH a AS (SELECT name FROM public.affiliates WHERE id = _affiliate_id),
  cutoff AS (SELECT GREATEST(_from, DATE '2026-06-26') AS dfrom),
  base AS (
    SELECT d.funnel, d.country, d.cpa_usd, d.crg_pct, d.max_invalid_pct,
      p.first_deposit_at, p.shaved_to, p.status,
      (p.created_at AT TIME ZONE 'Europe/Berlin')::date AS lead_day
    FROM public.affiliate_deals d
    JOIN a ON true
    LEFT JOIN public.profiles p
      ON lower(p.affiliate) = lower(a.name)
     AND lower(p.funnel)    = lower(d.funnel)
     AND lower(p.country)   = lower(d.country)
    WHERE d.affiliate_id = _affiliate_id AND d.status='active'
  ),
  agg AS (
    SELECT base.funnel, base.country, base.cpa_usd, base.crg_pct, base.max_invalid_pct,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN (SELECT dfrom FROM cutoff) AND _to)::int AS leads,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN (SELECT dfrom FROM cutoff) AND _to AND base.status IN ('Fake','Test','Wrong Details','Wrong Number','Invalid'))::int AS invalids,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN (SELECT dfrom FROM cutoff) AND _to AND base.first_deposit_at IS NOT NULL AND base.shaved_to IS NULL)::int AS ftds
    FROM base
    GROUP BY base.funnel, base.country, base.cpa_usd, base.crg_pct, base.max_invalid_pct
  )
  SELECT agg.funnel, agg.country, agg.cpa_usd, agg.crg_pct, agg.max_invalid_pct,
    agg.leads, agg.invalids,
    CASE WHEN agg.max_invalid_pct IS NULL THEN agg.invalids::numeric
         ELSE LEAST(agg.invalids::numeric, floor(agg.leads * agg.max_invalid_pct / 100.0)) END AS counted_invalids,
    (agg.leads - CASE WHEN agg.max_invalid_pct IS NULL THEN agg.invalids::numeric
                      ELSE LEAST(agg.invalids::numeric, floor(agg.leads * agg.max_invalid_pct / 100.0)) END) AS effective_leads,
    agg.ftds,
    ((agg.leads - CASE WHEN agg.max_invalid_pct IS NULL THEN agg.invalids::numeric
                       ELSE LEAST(agg.invalids::numeric, floor(agg.leads * agg.max_invalid_pct / 100.0)) END) * agg.crg_pct / 100.0) AS guaranteed,
    GREATEST(0, ((agg.leads - CASE WHEN agg.max_invalid_pct IS NULL THEN agg.invalids::numeric
                                    ELSE LEAST(agg.invalids::numeric, floor(agg.leads * agg.max_invalid_pct / 100.0)) END) * agg.crg_pct / 100.0) - agg.ftds) AS extra_owed,
    (agg.ftds + GREATEST(0, ((agg.leads - CASE WHEN agg.max_invalid_pct IS NULL THEN agg.invalids::numeric
                                                ELSE LEAST(agg.invalids::numeric, floor(agg.leads * agg.max_invalid_pct / 100.0)) END) * agg.crg_pct / 100.0) - agg.ftds)) * agg.cpa_usd AS period_charge
  FROM agg
  ORDER BY agg.funnel, agg.country
$function$;

-- CRG check: enforce cutoff in week aggregation
CREATE OR REPLACE FUNCTION public.affiliate_crg_check(_profile_id uuid)
 RETURNS TABLE(deal_id uuid, affiliate_id uuid, affiliate_name text, funnel text, country text, cpa_usd numeric, crg_pct numeric, max_invalid_pct numeric, week_leads integer, week_invalids integer, effective_leads numeric, week_ftds integer, guaranteed numeric, would_exceed boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH p AS (SELECT id, affiliate, funnel, country FROM public.profiles WHERE id = _profile_id),
  d AS (
    SELECT ad.*, af.name AS affiliate_name
    FROM public.affiliate_deals ad
    JOIN public.affiliates af ON af.id = ad.affiliate_id
    JOIN p ON lower(af.name) = lower(p.affiliate)
         AND lower(ad.funnel) = lower(p.funnel)
         AND lower(ad.country) = lower(p.country)
    WHERE ad.status='active' LIMIT 1
  ),
  bounds AS (
    SELECT GREATEST((date_trunc('week', (now() AT TIME ZONE 'Europe/Berlin')))::timestamp, '2026-06-26 00:00'::timestamp) AS ws,
      (date_trunc('week', (now() AT TIME ZONE 'Europe/Berlin')) + interval '6 days')::timestamp AS we
  ),
  wk AS (
    SELECT
      COUNT(*) FILTER (WHERE (pr.created_at AT TIME ZONE 'Europe/Berlin') >= b.ws AND (pr.created_at AT TIME ZONE 'Europe/Berlin') < b.we + interval '1 day')::int AS week_leads,
      COUNT(*) FILTER (WHERE pr.status IN ('Fake','Test','Wrong Details','Wrong Number','Invalid') AND (pr.created_at AT TIME ZONE 'Europe/Berlin') >= b.ws AND (pr.created_at AT TIME ZONE 'Europe/Berlin') < b.we + interval '1 day')::int AS week_invalids,
      COUNT(*) FILTER (WHERE pr.first_deposit_at IS NOT NULL AND pr.shaved_to IS NULL AND (pr.created_at AT TIME ZONE 'Europe/Berlin') >= b.ws AND (pr.created_at AT TIME ZONE 'Europe/Berlin') < b.we + interval '1 day')::int AS week_ftds
    FROM public.profiles pr, d, bounds b
    WHERE lower(pr.affiliate) = lower(d.affiliate_name)
      AND lower(pr.funnel)    = lower(d.funnel)
      AND lower(pr.country)   = lower(d.country)
  )
  SELECT d.id, d.affiliate_id, d.affiliate_name, d.funnel, d.country, d.cpa_usd, d.crg_pct, d.max_invalid_pct,
    COALESCE(wk.week_leads,0), COALESCE(wk.week_invalids,0),
    (COALESCE(wk.week_leads,0) - CASE WHEN d.max_invalid_pct IS NULL THEN COALESCE(wk.week_invalids,0)::numeric
                                       ELSE LEAST(COALESCE(wk.week_invalids,0)::numeric, floor(COALESCE(wk.week_leads,0) * d.max_invalid_pct / 100.0)) END)::numeric AS effective_leads,
    COALESCE(wk.week_ftds,0),
    ((COALESCE(wk.week_leads,0) - CASE WHEN d.max_invalid_pct IS NULL THEN COALESCE(wk.week_invalids,0)::numeric
                                        ELSE LEAST(COALESCE(wk.week_invalids,0)::numeric, floor(COALESCE(wk.week_leads,0) * d.max_invalid_pct / 100.0)) END) * d.crg_pct / 100.0)::numeric AS guaranteed,
    ((COALESCE(wk.week_ftds,0) + 1) > ((COALESCE(wk.week_leads,0) - CASE WHEN d.max_invalid_pct IS NULL THEN COALESCE(wk.week_invalids,0)::numeric
                                                                          ELSE LEAST(COALESCE(wk.week_invalids,0)::numeric, floor(COALESCE(wk.week_leads,0) * d.max_invalid_pct / 100.0)) END) * d.crg_pct / 100.0)) AS would_exceed
  FROM d LEFT JOIN wk ON true
$function$;

INSERT INTO public.platform_settings (key, value)
VALUES ('affiliate_budget_reset_at', '"2026-06-26"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
