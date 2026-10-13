insert into public.role_permissions (role_id, permission_id)
select r.id, p.id from public.roles r cross join public.permissions p
where r.name in ('Agent','Manager') and p.key = 'support.manage'
and not exists (select 1 from public.role_permissions rp where rp.role_id=r.id and rp.permission_id=p.id);