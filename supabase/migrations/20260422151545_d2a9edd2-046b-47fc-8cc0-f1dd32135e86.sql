-- Track whether a lead has already triggered the Thomas-Schmidt notification
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS thomas_notified_at timestamptz;

-- Trigger function: notify telegram once when assigned_agent becomes Thomas Schmidt
CREATE OR REPLACE FUNCTION public.notify_telegram_thomas_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _agent_name text;
BEGIN
  -- Only when assigned_agent is set and changed (or insert)
  IF NEW.assigned_agent IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.assigned_agent IS NOT DISTINCT FROM NEW.assigned_agent THEN
    RETURN NEW;
  END IF;

  -- Skip if already notified for this lead
  IF NEW.thomas_notified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Resolve agent name
  SELECT full_name INTO _agent_name
  FROM public.profiles
  WHERE id = NEW.assigned_agent;

  IF _agent_name IS NULL OR lower(trim(_agent_name)) <> 'thomas schmidt' THEN
    RETURN NEW;
  END IF;

  -- Mark as notified BEFORE firing to avoid duplicates
  NEW.thomas_notified_at := now();

  -- Call the existing telegram-notify-lead edge function
  PERFORM net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/telegram-notify-lead',
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'full_name', NEW.full_name,
        'email', NEW.email,
        'assigned_to', 'Thomas Schmidt'
      ),
      'force_chat_id', '-5268392339'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    )
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_telegram_thomas_assignment ON public.profiles;
CREATE TRIGGER trg_notify_telegram_thomas_assignment
BEFORE INSERT OR UPDATE OF assigned_agent ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_telegram_thomas_assignment();