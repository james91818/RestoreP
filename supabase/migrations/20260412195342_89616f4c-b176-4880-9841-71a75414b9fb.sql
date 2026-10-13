-- Fix profiles: Agents should only see assigned profiles
DROP POLICY "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
FOR SELECT TO public
USING (
  auth.uid() = id
  OR (has_permission(auth.uid(), 'users.manage') AND NOT has_role_by_name(auth.uid(), 'Agent'))
  OR assigned_agent = auth.uid()
);

-- Fix deposits: Agents should only see deposits from their assigned users
DROP POLICY "Users read own deposits" ON public.deposits;
CREATE POLICY "Users read own deposits" ON public.deposits
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR (has_permission(auth.uid(), 'deposits.manage') AND NOT has_role_by_name(auth.uid(), 'Agent'))
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = deposits.user_id AND p.assigned_agent = auth.uid()
  )
);