
CREATE OR REPLACE FUNCTION public.affiliate_period_stats(_affiliate_id uuid, _from date, _to date)
RETURNS TABLE(
  funnel text, country text,
  cpa_usd numeric, crg_pct numeric, max_invalid_pct numeric,
  leads integer, invalids integer,
  counted_invalids numeric, effective_leads numeric,
  ftds integer, guaranteed numeric, extra_owed numeric, period_charge numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  WITH a AS (SELECT name FROM public.affiliates WHERE id = _affiliate_id),
  base AS (
    SELECT
      d.funnel, d.country, d.cpa_usd, d.crg_pct, d.max_invalid_pct,
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
    SELECT
      base.funnel, base.country, base.cpa_usd, base.crg_pct, base.max_invalid_pct,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN _from AND _to)::int AS leads,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN _from AND _to AND base.status IN ('Fake','Test','Wrong Details','Wrong Number','Invalid'))::int AS invalids,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN _from AND _to AND base.first_deposit_at IS NOT NULL AND base.shaved_to IS NULL)::int AS ftds
    FROM base
    GROUP BY base.funnel, base.country, base.cpa_usd, base.crg_pct, base.max_invalid_pct
  )
  SELECT
    agg.funnel, agg.country, agg.cpa_usd, agg.crg_pct, agg.max_invalid_pct,
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
$$;

GRANT EXECUTE ON FUNCTION public.affiliate_period_stats(uuid, date, date) TO authenticated, service_role;
