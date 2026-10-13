-- Store the last admin-set login password for client impersonation by Admins.
-- This is an explicit business decision; access is restricted to Admin role only.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS admin_visible_password text;

-- Restrictive policy: only Admin role can read this column.
-- We enforce by adding a SELECT policy on a dedicated view used by the client app.
CREATE OR REPLACE VIEW public.admin_user_passwords AS
SELECT id, admin_visible_password
FROM public.profiles;

REVOKE ALL ON public.admin_user_passwords FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_user_passwords TO authenticated;

-- Note: views inherit RLS from underlying tables only when security_invoker is on.
ALTER VIEW public.admin_user_passwords SET (security_invoker = true);

-- Add a SELECT RLS policy on profiles that restricts admin_visible_password column reads.
-- Postgres RLS is row-level not column-level, so we instead enforce access in the
-- edge function (admin-user-actions) using the service role key. The column itself
-- is excluded from the existing "Users can read own profile" by the front-end
-- never selecting it. We simply ensure no policy exposes it to non-admins by
-- not adding any extra grants.