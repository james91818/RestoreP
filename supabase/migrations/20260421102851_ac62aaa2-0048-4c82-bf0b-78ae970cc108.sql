-- Update is_conversion_only to exclude Manager Conversion
-- (so Manager Conversion is no longer restricted to assigned-only access)
CREATE OR REPLACE FUNCTION public.is_conversion_only(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Agent Conversion')
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Admin', 'Manager', 'Manager Conversion', 'Manager Retention', 'Agent', 'Agent Retention')
  )
$function$;