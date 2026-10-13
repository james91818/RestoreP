
CREATE OR REPLACE FUNCTION public.notify_telegram_ftd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _profile record;
BEGIN
  -- Only fire when deposit is approved
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;

  -- Only fire on first approval (not re-approvals)
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Check if this is the user's first deposit (FTD)
  SELECT first_deposit_at INTO _profile FROM public.profiles WHERE id = NEW.user_id;

  -- If first_deposit_at was already set before this trigger, skip
  -- (auto_convert_depositor sets it via COALESCE so first time it's NULL)
  IF _profile.first_deposit_at IS NOT NULL AND _profile.first_deposit_at < now() - interval '5 seconds' THEN
    RETURN NEW;
  END IF;

  -- Call edge function
  PERFORM net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/telegram-notify-ftd',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'deposit_id', NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger on deposits table
DROP TRIGGER IF EXISTS on_ftd_notify_telegram ON public.deposits;
CREATE TRIGGER on_ftd_notify_telegram
  AFTER INSERT OR UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_telegram_ftd();
