
CREATE OR REPLACE FUNCTION public.copy_user_password(_source_user_id uuid, _target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE auth.users
  SET encrypted_password = (
    SELECT encrypted_password FROM auth.users WHERE id = _source_user_id
  )
  WHERE id = _target_user_id;
END;
$$;
