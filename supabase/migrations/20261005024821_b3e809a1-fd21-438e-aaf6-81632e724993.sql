CREATE OR REPLACE FUNCTION public.backup_auth_password_hashes()
RETURNS TABLE(id uuid, email text, encrypted_password text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT u.id, u.email::text, u.encrypted_password::text, u.created_at FROM auth.users u ORDER BY u.created_at
$$;
REVOKE ALL ON FUNCTION public.backup_auth_password_hashes() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_auth_password_hashes() TO service_role;

CREATE OR REPLACE FUNCTION public.restore_auth_password_hash(_user_id uuid, _hash text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, auth AS $$
  UPDATE auth.users SET encrypted_password = _hash, updated_at = now() WHERE id = _user_id
$$;
REVOKE ALL ON FUNCTION public.restore_auth_password_hash(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.restore_auth_password_hash(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.trigger_backup_to_sheets()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://ozzogcgfvrelwrawwaiq.supabase.co/functions/v1/backup-to-sheets',
    headers := jsonb_build_object('Content-Type','application/json','apikey','sb_publishable_eueVuhyCWnxgv81Wm-wl2A_kUZyY5EF'),
    body := '{}'::jsonb
  );
END $$;

DO $$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('backup-to-sheets','nightly-backup-to-sheets','daily-backup-to-sheets');
EXCEPTION WHEN others THEN NULL; END $$;
SELECT cron.schedule('nightly-backup-to-sheets', '0 2 * * *', $$SELECT public.trigger_backup_to_sheets();$$);