
-- Thomas Schmidt grandfathered lead visibility:
-- He sees all leads/profiles created up to a cutoff, plus only his assigned ones after that.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id)
  OR (
    has_permission(auth.uid(), 'users.manage'::text)
    AND (NOT is_agent_like(auth.uid()))
    AND (NOT is_conversion_only(auth.uid()))
  )
  OR (
    is_conversion_only(auth.uid())
    AND (
      ((is_lead = false) AND (ftd_agent = auth.uid()))
      OR ((is_lead = true) AND (assigned_agent = auth.uid()))
    )
  )
  OR (
    is_agent_like(auth.uid())
    AND (NOT is_conversion_only(auth.uid()))
    AND (assigned_agent = auth.uid())
  )
  -- Thomas Schmidt grandfathered access: all profiles created before the cutoff
  OR (
    auth.uid() = '5d815b4f-8b9c-449c-b92d-cc0aaed27686'::uuid
    AND created_at < '2026-04-23 08:00:47+00'::timestamptz
  )
);
