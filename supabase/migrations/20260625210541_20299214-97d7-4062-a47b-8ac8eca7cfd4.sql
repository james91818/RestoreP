
-- ============ affiliate_deals ============
CREATE TABLE public.affiliate_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  funnel text NOT NULL,
  country text NOT NULL,
  cpa_usd numeric(12,2) NOT NULL CHECK (cpa_usd >= 0),
  crg_pct numeric(6,2) NOT NULL DEFAULT 0 CHECK (crg_pct >= 0 AND crg_pct <= 100),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_deals TO authenticated;
GRANT ALL ON public.affiliate_deals TO service_role;

ALTER TABLE public.affiliate_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage affiliate_deals"
ON public.affiliate_deals FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(),'Admin'))
WITH CHECK (public.has_role_by_name(auth.uid(),'Admin'));

CREATE POLICY "Staff read affiliate_deals"
ON public.affiliate_deals FOR SELECT TO authenticated
USING (
  public.has_role_by_name(auth.uid(),'Admin')
  OR public.has_role_by_name(auth.uid(),'Manager')
  OR public.has_role_by_name(auth.uid(),'Manager Conversion')
  OR public.has_role_by_name(auth.uid(),'Manager Retention')
  OR public.is_agent_like(auth.uid())
);

CREATE UNIQUE INDEX affiliate_deals_active_uniq
  ON public.affiliate_deals(affiliate_id, lower(funnel), lower(country))
  WHERE status = 'active';

CREATE INDEX affiliate_deals_lookup_idx
  ON public.affiliate_deals(affiliate_id, lower(funnel), lower(country), status);

CREATE TRIGGER trg_affiliate_deals_updated_at
BEFORE UPDATE ON public.affiliate_deals
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ affiliate_topups ============
CREATE TABLE public.affiliate_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  amount_usd numeric(14,2) NOT NULL CHECK (amount_usd <> 0),
  sent_at date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Berlin')::date,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_topups TO authenticated;
GRANT ALL ON public.affiliate_topups TO service_role;

ALTER TABLE public.affiliate_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage affiliate_topups"
ON public.affiliate_topups FOR ALL TO authenticated
USING (public.has_role_by_name(auth.uid(),'Admin'))
WITH CHECK (public.has_role_by_name(auth.uid(),'Admin'));

CREATE INDEX affiliate_topups_affiliate_idx
  ON public.affiliate_topups(affiliate_id, sent_at DESC);

CREATE TRIGGER trg_affiliate_topups_updated_at
BEFORE UPDATE ON public.affiliate_topups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- profile lookup index for matching FTDs to deals
CREATE INDEX IF NOT EXISTS profiles_affiliate_funnel_country_idx
  ON public.profiles(lower(affiliate), lower(funnel), lower(country))
  WHERE first_deposit_at IS NOT NULL;

-- ============ v_affiliate_balances ============
CREATE OR REPLACE VIEW public.v_affiliate_balances AS
WITH topups AS (
  SELECT affiliate_id, COALESCE(SUM(amount_usd),0) AS total_topups
  FROM public.affiliate_topups GROUP BY affiliate_id
),
ftds AS (
  SELECT
    a.id AS affiliate_id,
    COUNT(*) FILTER (WHERE p.shaved_to IS NULL) AS billable_ftds,
    COUNT(*) FILTER (WHERE p.shaved_to IS NOT NULL) AS shaved_ftds,
    COALESCE(SUM(d.cpa_usd) FILTER (WHERE p.shaved_to IS NULL),0) AS spent_usd
  FROM public.affiliates a
  LEFT JOIN public.affiliate_deals d
    ON d.affiliate_id = a.id AND d.status = 'active'
  LEFT JOIN public.profiles p
    ON lower(p.affiliate) = lower(a.name)
   AND lower(p.funnel)    = lower(d.funnel)
   AND lower(p.country)   = lower(d.country)
   AND p.first_deposit_at IS NOT NULL
  GROUP BY a.id
)
SELECT
  a.id AS affiliate_id,
  a.name AS affiliate_name,
  COALESCE(t.total_topups,0)::numeric AS total_topups,
  COALESCE(f.billable_ftds,0)::int   AS billable_ftds,
  COALESCE(f.shaved_ftds,0)::int     AS shaved_ftds,
  COALESCE(f.spent_usd,0)::numeric   AS spent_usd,
  (COALESCE(t.total_topups,0) - COALESCE(f.spent_usd,0))::numeric AS balance_usd,
  CASE WHEN COALESCE(f.billable_ftds,0) + COALESCE(f.shaved_ftds,0) > 0
       THEN (COALESCE(t.total_topups,0) / (COALESCE(f.billable_ftds,0) + COALESCE(f.shaved_ftds,0)))::numeric
       ELSE NULL END AS cpa_before_shave,
  CASE WHEN COALESCE(f.billable_ftds,0) > 0
       THEN (COALESCE(t.total_topups,0) / COALESCE(f.billable_ftds,0))::numeric
       ELSE NULL END AS cpa_after_shave
FROM public.affiliates a
LEFT JOIN topups t ON t.affiliate_id = a.id
LEFT JOIN ftds   f ON f.affiliate_id = a.id;

GRANT SELECT ON public.v_affiliate_balances TO authenticated;
GRANT ALL    ON public.v_affiliate_balances TO service_role;

-- ============ affiliate_weekly_stats(affiliate_id) ============
CREATE OR REPLACE FUNCTION public.affiliate_weekly_stats(_affiliate_id uuid)
RETURNS TABLE(
  week_start date,
  funnel text,
  country text,
  cpa_usd numeric,
  crg_pct numeric,
  leads int,
  ftds int,
  guaranteed numeric,
  extra_owed numeric,
  week_charge numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH a AS (SELECT name FROM public.affiliates WHERE id = _affiliate_id),
  base AS (
    SELECT
      date_trunc('week', (p.created_at AT TIME ZONE 'Europe/Berlin'))::date AS week_start,
      d.funnel, d.country, d.cpa_usd, d.crg_pct,
      p.first_deposit_at, p.shaved_to
    FROM public.affiliate_deals d
    JOIN a ON true
    LEFT JOIN public.profiles p
      ON lower(p.affiliate) = lower(a.name)
     AND lower(p.funnel)    = lower(d.funnel)
     AND lower(p.country)   = lower(d.country)
    WHERE d.affiliate_id = _affiliate_id AND d.status='active'
  )
  SELECT
    week_start,
    funnel, country, cpa_usd, crg_pct,
    COUNT(*)::int AS leads,
    COUNT(*) FILTER (WHERE first_deposit_at IS NOT NULL AND shaved_to IS NULL)::int AS ftds,
    (COUNT(*) * crg_pct / 100.0)::numeric AS guaranteed,
    GREATEST(0, (COUNT(*) * crg_pct / 100.0)
      - COUNT(*) FILTER (WHERE first_deposit_at IS NOT NULL AND shaved_to IS NULL))::numeric AS extra_owed,
    (
      COUNT(*) FILTER (WHERE first_deposit_at IS NOT NULL AND shaved_to IS NULL)
      + GREATEST(0, (COUNT(*) * crg_pct / 100.0)
        - COUNT(*) FILTER (WHERE first_deposit_at IS NOT NULL AND shaved_to IS NULL))
    ) * cpa_usd AS week_charge
  FROM base
  WHERE week_start IS NOT NULL
  GROUP BY week_start, funnel, country, cpa_usd, crg_pct
  ORDER BY week_start DESC, funnel, country
$$;

GRANT EXECUTE ON FUNCTION public.affiliate_weekly_stats(uuid) TO authenticated;

-- ============ affiliate_crg_check(profile_id) ============
-- Returns matching deal info + counts for this Mon–Sat window so the UI can
-- decide whether converting this profile to FTD would exceed the weekly CRG.
CREATE OR REPLACE FUNCTION public.affiliate_crg_check(_profile_id uuid)
RETURNS TABLE(
  deal_id uuid,
  affiliate_id uuid,
  affiliate_name text,
  funnel text,
  country text,
  cpa_usd numeric,
  crg_pct numeric,
  week_leads int,
  week_ftds int,
  guaranteed numeric,
  would_exceed boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT id, affiliate, funnel, country FROM public.profiles WHERE id = _profile_id
  ),
  d AS (
    SELECT ad.*, af.name AS affiliate_name
    FROM public.affiliate_deals ad
    JOIN public.affiliates af ON af.id = ad.affiliate_id
    JOIN p ON lower(af.name) = lower(p.affiliate)
         AND lower(ad.funnel) = lower(p.funnel)
         AND lower(ad.country) = lower(p.country)
    WHERE ad.status='active'
    LIMIT 1
  ),
  bounds AS (
    SELECT
      (date_trunc('week', (now() AT TIME ZONE 'Europe/Berlin')))::timestamp AS week_start_local,
      (date_trunc('week', (now() AT TIME ZONE 'Europe/Berlin')) + interval '6 days')::timestamp AS week_end_local
  ),
  wk AS (
    SELECT
      COUNT(*) FILTER (
        WHERE (pr.created_at AT TIME ZONE 'Europe/Berlin') >= b.week_start_local
          AND (pr.created_at AT TIME ZONE 'Europe/Berlin') <  b.week_end_local + interval '1 day'
      )::int AS week_leads,
      COUNT(*) FILTER (
        WHERE pr.first_deposit_at IS NOT NULL AND pr.shaved_to IS NULL
          AND (pr.created_at AT TIME ZONE 'Europe/Berlin') >= b.week_start_local
          AND (pr.created_at AT TIME ZONE 'Europe/Berlin') <  b.week_end_local + interval '1 day'
      )::int AS week_ftds
    FROM public.profiles pr, d, bounds b
    WHERE lower(pr.affiliate) = lower(d.affiliate_name)
      AND lower(pr.funnel)    = lower(d.funnel)
      AND lower(pr.country)   = lower(d.country)
  )
  SELECT
    d.id, d.affiliate_id, d.affiliate_name, d.funnel, d.country,
    d.cpa_usd, d.crg_pct,
    COALESCE(wk.week_leads,0), COALESCE(wk.week_ftds,0),
    (COALESCE(wk.week_leads,0) * d.crg_pct / 100.0)::numeric AS guaranteed,
    ((COALESCE(wk.week_ftds,0) + 1) > (COALESCE(wk.week_leads,0) * d.crg_pct / 100.0)) AS would_exceed
  FROM d LEFT JOIN wk ON true
$$;

GRANT EXECUTE ON FUNCTION public.affiliate_crg_check(uuid) TO authenticated;
