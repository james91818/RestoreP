CREATE OR REPLACE FUNCTION public.notify_telegram_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _payload jsonb;
BEGIN
  IF NEW.is_lead IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'record', jsonb_build_object(
      'id', NEW.id,
      'full_name', NEW.full_name,
      'email', NEW.email,
      'phone', NEW.phone,
      'country', NEW.country,
      'affiliate', NEW.affiliate,
      'funnel', NEW.funnel,
      'created_at', NEW.created_at
    )
  );

  PERFORM net.http_post(
    url := 'https://rdqivjvsligevpjqrnfe.supabase.co/functions/v1/telegram-notify-lead',
    body := _payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_LWCCs0K87xp25fztZkb3-Q_tStDg4aP'
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_telegram_thomas_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _agent_name text;
  _cfg jsonb;
  _channel jsonb;
  _enabled boolean := true;
  _chat_id text := '';
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

  IF NOT _enabled OR _chat_id = '' THEN
    RETURN NEW;
  END IF;

  NEW.thomas_notified_at := now();

  PERFORM net.http_post(
    url := 'https://rdqivjvsligevpjqrnfe.supabase.co/functions/v1/telegram-notify-lead',
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
      'Authorization', 'Bearer sb_publishable_LWCCs0K87xp25fztZkb3-Q_tStDg4aP'
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_telegram_ftd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    url := 'https://rdqivjvsligevpjqrnfe.supabase.co/functions/v1/telegram-notify-ftd',
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'deposit_id', NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_LWCCs0K87xp25fztZkb3-Q_tStDg4aP'
    )
  );

  RETURN NEW;
END;
$$;