CREATE OR REPLACE FUNCTION public.notify_telegram_thomas_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _agent_name text;
  _cfg jsonb;
  _channel jsonb;
  _enabled boolean := true;
  _chat_id text := '-5268392339';
BEGIN
  IF NEW.assigned_agent IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.assigned_agent IS NOT DISTINCT FROM NEW.assigned_agent THEN
    RETURN NEW;
  END IF;

  IF NEW.thomas_notified_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT full_name INTO _agent_name
  FROM public.profiles
  WHERE id = NEW.assigned_agent;

  IF _agent_name IS NULL OR lower(trim(_agent_name)) <> 'thomas schmidt' THEN
    RETURN NEW;
  END IF;

  -- Read settings from platform_settings.telegram_bot.thomas_assignment
  SELECT value INTO _cfg FROM public.platform_settings WHERE key = 'telegram_bot';
  IF _cfg IS NOT NULL THEN
    _channel := _cfg->'thomas_assignment';
    IF _channel IS NOT NULL THEN
      IF (_channel->>'enabled') = 'false' THEN
        _enabled := false;
      END IF;
      IF COALESCE(_channel->>'chat_id', '') <> '' THEN
        _chat_id := _channel->>'chat_id';
      END IF;
    END IF;
  END IF;

  IF NOT _enabled THEN
    RETURN NEW;
  END IF;

  -- Mark as notified BEFORE firing to avoid duplicates
  NEW.thomas_notified_at := now();

  PERFORM net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/telegram-notify-lead',
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'id', NEW.id,
        'full_name', NEW.full_name,
        'email', NEW.email,
        'assigned_to', 'Thomas Schmidt'
      ),
      'force_chat_id', _chat_id,
      'notification_type', 'thomas_assignment'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    )
  );

  RETURN NEW;
END;
$function$;