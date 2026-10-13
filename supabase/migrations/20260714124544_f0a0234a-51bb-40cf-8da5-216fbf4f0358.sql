
CREATE TABLE public.sheets_ftd_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  deposit_id uuid,
  tab_name text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sheets_ftd_log TO authenticated;
GRANT ALL ON public.sheets_ftd_log TO service_role;

ALTER TABLE public.sheets_ftd_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sheets ftd log"
  ON public.sheets_ftd_log FOR SELECT
  TO authenticated
  USING (public.has_role_by_name(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.notify_sheets_ftd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile record;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT first_deposit_at INTO _profile FROM public.profiles WHERE id = NEW.user_id;

  IF _profile.first_deposit_at IS NOT NULL AND _profile.first_deposit_at < now() - interval '5 seconds' THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/sheets-log-ftd',
    body := jsonb_build_object('user_id', NEW.user_id, 'deposit_id', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS on_ftd_sheets_log ON public.deposits;
CREATE TRIGGER on_ftd_sheets_log
  AFTER INSERT OR UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_sheets_ftd();
