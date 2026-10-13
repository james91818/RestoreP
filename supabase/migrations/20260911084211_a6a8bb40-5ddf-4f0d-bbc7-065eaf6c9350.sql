CREATE OR REPLACE FUNCTION public.get_my_account_manager()
RETURNS TABLE(full_name text, email text, avatar_url text, phone text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.full_name, a.email, a.avatar_url, a.phone
  FROM public.profiles c
  JOIN public.profiles a ON a.id = c.assigned_agent
  WHERE c.id = auth.uid()
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_my_account_manager() TO authenticated;