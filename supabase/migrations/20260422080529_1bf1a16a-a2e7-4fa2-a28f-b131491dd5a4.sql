-- Restrict Manager Conversion to only see leads assigned to them
-- by including them back in is_conversion_only
CREATE OR REPLACE FUNCTION public.is_conversion_only(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Agent Conversion', 'Manager Conversion')
  )
$$;