CREATE OR REPLACE FUNCTION public.affiliate_period_stats(_affiliate_id uuid, _from date, _to date, _include_shaved boolean DEFAULT false)
 RETURNS TABLE(funnel text, country text, cpa_usd numeric, crg_pct numeric, max_invalid_pct numeric, leads integer, invalids integer, counted_invalids numeric, effective_leads numeric, ftds integer, guaranteed numeric, extra_owed numeric, period_charge numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH a AS (SELECT name FROM public.affiliates WHERE id = _affiliate_id),
  cutoff AS (SELECT GREATEST(_from, DATE '2026-06-26') AS dfrom),
  base AS (
    SELECT d.funnel, d.country, d.cpa_usd, d.crg_pct, d.max_invalid_pct,
      p.status,
      (p.created_at AT TIME ZONE 'Europe/Berlin')::date AS lead_day,
      (
        (p.first_deposit_at IS NOT NULL AND p.shaved_to IS NULL)
        OR (_include_shaved AND p.shaved_to IS NOT NULL AND sp.first_deposit_at IS NOT NULL)
      ) AS is_ftd
    FROM public.affiliate_deals d
    JOIN a ON true
    LEFT JOIN public.profiles p
      ON lower(p.affiliate) = lower(a.name)
     AND lower(p.funnel)    = lower(d.funnel)
     AND lower(p.country)   = lower(d.country)
    LEFT JOIN public.profiles sp ON sp.id = p.shaved_to
    WHERE d.affiliate_id = _affiliate_id AND d.status='active'
  ),
  agg AS (
    SELECT base.funnel, base.country, base.cpa_usd, base.crg_pct, base.max_invalid_pct,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN (SELECT dfrom FROM cutoff) AND _to)::int AS leads,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN (SELECT dfrom FROM cutoff) AND _to AND base.status IN ('Fake','Test','Wrong Details','Wrong Number','Invalid'))::int AS invalids,
      COUNT(*) FILTER (WHERE base.lead_day BETWEEN (SELECT dfrom FROM cutoff) AND _to AND base.is_ftd)::int AS ftds
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

CREATE OR REPLACE FUNCTION public.affiliate_weekly_stats(_affiliate_id uuid, _include_shaved boolean DEFAULT false)
 RETURNS TABLE(week_start date, funnel text, country text, cpa_usd numeric, crg_pct numeric, max_invalid_pct numeric, leads integer, invalids integer, counted_invalids numeric, effective_leads numeric, ftds integer, guaranteed numeric, extra_owed numeric, week_charge numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH a AS (SELECT name FROM public.affiliates WHERE id = _affiliate_id),
  base AS (
    SELECT
      date_trunc('week', (p.created_at AT TIME ZONE 'Europe/Berlin'))::date AS week_start,
      d.funnel, d.country, d.cpa_usd, d.crg_pct, d.max_invalid_pct,
      p.status,
      (
        (p.first_deposit_at IS NOT NULL AND p.shaved_to IS NULL)
        OR (_include_shaved AND p.shaved_to IS NOT NULL AND sp.first_deposit_at IS NOT NULL)
      ) AS is_ftd
    FROM public.affiliate_deals d
    JOIN a ON true
    LEFT JOIN public.profiles p
      ON lower(p.affiliate) = lower(a.name)
     AND lower(p.funnel)    = lower(d.funnel)
     AND lower(p.country)   = lower(d.country)
    LEFT JOIN public.profiles sp ON sp.id = p.shaved_to
    WHERE d.affiliate_id = _affiliate_id AND d.status='active'
  ),
  agg AS (
    SELECT
      base.week_start, base.funnel, base.country, base.cpa_usd, base.crg_pct, base.max_invalid_pct,
      COUNT(*)::int AS leads,
      COUNT(*) FILTER (WHERE base.status IN ('Fake','Test','Wrong Details','Wrong Number','Invalid'))::int AS invalids,
      COUNT(*) FILTER (WHERE base.is_ftd)::int AS ftds
    FROM base
    WHERE base.week_start IS NOT NULL
    GROUP BY base.week_start, base.funnel, base.country, base.cpa_usd, base.crg_pct, base.max_invalid_pct
  )
  SELECT
    agg.week_start, agg.funnel, agg.country, agg.cpa_usd, agg.crg_pct, agg.max_invalid_pct,
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
                                                ELSE LEAST(agg.invalids::numeric, floor(agg.leads * agg.max_invalid_pct / 100.0)) END) * agg.crg_pct / 100.0) - agg.ftds)) * agg.cpa_usd AS week_charge
  FROM agg
  ORDER BY agg.week_start DESC, agg.funnel, agg.country
$function$;