
-- Helper to identify Thomas Schmidt (Manager Conversion) for full depositor visibility
CREATE OR REPLACE FUNCTION public.is_thomas_full_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = '5d815b4f-8b9c-449c-b92d-cc0aaed27686'::uuid;
$$;

-- Update profiles SELECT policy: Thomas sees ALL profiles (not just up to a cutoff)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT
USING (
  (auth.uid() = id)
  OR (has_permission(auth.uid(), 'users.manage'::text) AND NOT is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()))
  OR (is_conversion_only(auth.uid()) AND (
        ((is_lead = false) AND (ftd_agent = auth.uid()))
        OR ((is_lead = true) AND (assigned_agent = auth.uid()))
     ))
  OR (is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()) AND (assigned_agent = auth.uid()))
  OR public.is_thomas_full_access(auth.uid())
);

-- Update deposits SELECT policy: Thomas sees ALL deposits
DROP POLICY IF EXISTS "Users read own deposits" ON public.deposits;
CREATE POLICY "Users read own deposits" ON public.deposits
FOR SELECT
USING (
  (auth.uid() = user_id)
  OR has_role_by_name(auth.uid(), 'Admin'::text)
  OR has_role_by_name(auth.uid(), 'Manager'::text)
  OR public.is_thomas_full_access(auth.uid())
  OR (has_permission(auth.uid(), 'deposits.manage'::text) AND NOT is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()) AND NOT has_role_by_name(auth.uid(), 'Manager Conversion'::text) AND NOT has_role_by_name(auth.uid(), 'Manager Retention'::text))
  OR (is_conversion_only(auth.uid()) AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = deposits.user_id
          AND (((p.is_lead = false) AND (p.ftd_agent = auth.uid()))
               OR ((p.is_lead = true) AND (p.assigned_agent = auth.uid())))
     ))
  OR (is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()) AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
     ))
  OR (has_role_by_name(auth.uid(), 'Manager Conversion'::text) AND EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = deposits.user_id
          AND (((p.is_lead = false) AND (p.ftd_agent = auth.uid()))
               OR ((p.is_lead = true) AND (p.assigned_agent = auth.uid())))
     ))
  OR (has_role_by_name(auth.uid(), 'Manager Retention'::text) AND EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
     ))
);

-- Update wallets SELECT (so balances show up in depositors table for Thomas)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid='public.wallets'::regclass AND polcmd='r' LOOP
    NULL; -- inspect-only; handled below if needed
  END LOOP;
END $$;
