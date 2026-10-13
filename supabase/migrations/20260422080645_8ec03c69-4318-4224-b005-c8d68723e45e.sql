-- 1. Add ftd_agent column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ftd_agent uuid;

-- 2. Backfill existing depositors with their currently assigned agent
UPDATE public.profiles
SET ftd_agent = assigned_agent
WHERE is_lead = false
  AND first_deposit_at IS NOT NULL
  AND ftd_agent IS NULL
  AND assigned_agent IS NOT NULL;

-- 3. Update auto_convert_depositor to capture the FTD agent
CREATE OR REPLACE FUNCTION public.auto_convert_depositor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _was_lead boolean;
  _current_agent uuid;
BEGIN
  IF NEW.status = 'approved' AND NEW.amount >= 1 THEN
    SELECT is_lead, assigned_agent INTO _was_lead, _current_agent
    FROM public.profiles WHERE id = NEW.user_id;

    UPDATE public.profiles
    SET is_lead = false,
        first_deposit_at = COALESCE(first_deposit_at, now()),
        ftd_agent = COALESCE(ftd_agent, _current_agent)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Replace profiles SELECT policy to enforce ftd_agent for Agent Conversion depositors
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR (
    has_permission(auth.uid(), 'users.manage')
    AND NOT is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
  )
  OR (
    -- Agent Conversion: depositors require ftd_agent match, leads use assigned_agent
    is_conversion_only(auth.uid())
    AND (
      (is_lead = false AND ftd_agent = auth.uid())
      OR (is_lead = true AND assigned_agent = auth.uid())
    )
  )
  OR (
    -- Other agent-like roles (Agent, Agent Retention): use assigned_agent as before
    is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
    AND assigned_agent = auth.uid()
  )
);

-- 5. Replace deposits SELECT policy with same logic
DROP POLICY IF EXISTS "Users read own deposits" ON public.deposits;

CREATE POLICY "Users read own deposits"
ON public.deposits
FOR SELECT
USING (
  auth.uid() = user_id
  OR (
    has_permission(auth.uid(), 'deposits.manage')
    AND NOT is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
  )
  OR (
    is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = deposits.user_id
        AND (
          (p.is_lead = false AND p.ftd_agent = auth.uid())
          OR (p.is_lead = true AND p.assigned_agent = auth.uid())
        )
    )
  )
  OR (
    is_agent_like(auth.uid())
    AND NOT is_conversion_only(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
    )
  )
);