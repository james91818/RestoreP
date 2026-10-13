DELETE FROM public.role_permissions WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('Agent','Manager'));
DELETE FROM public.phone_prefix_roles WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('Agent','Manager'));
DELETE FROM public.user_roles WHERE role_id IN (SELECT id FROM public.roles WHERE name IN ('Agent','Manager'));
DELETE FROM public.roles WHERE name IN ('Agent','Manager');