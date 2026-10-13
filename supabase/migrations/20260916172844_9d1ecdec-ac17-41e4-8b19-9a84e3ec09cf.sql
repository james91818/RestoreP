REVOKE ALL ON FUNCTION public.is_staff_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_staff_member(uuid) TO authenticated, service_role;