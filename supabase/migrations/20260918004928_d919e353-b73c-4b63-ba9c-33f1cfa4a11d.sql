CREATE TABLE public.backup_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'running',
  tables_backed_up integer NOT NULL DEFAULT 0,
  total_rows integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.backup_runs TO authenticated;
GRANT ALL ON public.backup_runs TO service_role;

ALTER TABLE public.backup_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view backup runs"
ON public.backup_runs FOR SELECT TO authenticated
USING (public.is_staff_member(auth.uid()));

CREATE OR REPLACE FUNCTION public.trigger_backup_to_sheets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://rdqivjvsligevpjqrnfe.supabase.co/functions/v1/backup-to-sheets',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
END;
$$;

SELECT cron.unschedule('backup-to-sheets-morning') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backup-to-sheets-morning');
SELECT cron.unschedule('backup-to-sheets-evening') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'backup-to-sheets-evening');

SELECT cron.schedule('backup-to-sheets-morning', '0 4 * * *', $cron$ SELECT public.trigger_backup_to_sheets(); $cron$);
SELECT cron.schedule('backup-to-sheets-evening', '0 16 * * *', $cron$ SELECT public.trigger_backup_to_sheets(); $cron$);