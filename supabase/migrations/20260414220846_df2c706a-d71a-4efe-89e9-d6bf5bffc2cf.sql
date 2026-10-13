
-- 1. Fix copy_user_password: revoke public access, grant only to service_role
REVOKE EXECUTE ON FUNCTION public.copy_user_password(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.copy_user_password(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.copy_user_password(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.copy_user_password(uuid, uuid) TO service_role;

-- 2. Tighten trades INSERT policy to enforce safe defaults
DROP POLICY IF EXISTS "Users insert trades" ON public.trades;
CREATE POLICY "Users insert trades" ON public.trades
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'open'
  AND pnl = 0
  AND closed_at IS NULL
  AND size > 0
  AND entry_price > 0
  AND leverage >= 1
  AND leverage <= 100
);

-- 3. Tighten user_stakes INSERT policy
DROP POLICY IF EXISTS "Users insert stakes" ON public.user_stakes;
CREATE POLICY "Users insert stakes" ON public.user_stakes
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND rewards_earned = 0
  AND claimed = false
  AND amount > 0
);

-- 4. Restrict platform_settings read to staff only
DROP POLICY IF EXISTS "Anyone can read platform_settings" ON public.platform_settings;
CREATE POLICY "Staff can read platform_settings" ON public.platform_settings
FOR SELECT TO authenticated
USING (has_role_by_name(auth.uid(), 'Admin'::text) OR has_role_by_name(auth.uid(), 'Manager'::text) OR has_role_by_name(auth.uid(), 'Agent'::text));
