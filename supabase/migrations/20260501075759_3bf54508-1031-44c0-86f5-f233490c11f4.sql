-- Gate inbound client email replies behind a platform setting controlled by Admin
CREATE OR REPLACE FUNCTION public.post_client_reply_by_token(_token TEXT, _body TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread record;
  _reply_id UUID;
  _msg TEXT;
  _inbound_enabled BOOLEAN;
BEGIN
  IF _body IS NULL OR length(trim(_body)) = 0 THEN
    RAISE EXCEPTION 'Reply body cannot be empty';
  END IF;
  IF length(_body) > 10000 THEN
    RAISE EXCEPTION 'Reply too long';
  END IF;

  -- Check if inbound replies are enabled (defaults to true if not set)
  SELECT COALESCE((value->>'inbound_enabled')::boolean, true)
    INTO _inbound_enabled
  FROM public.platform_settings
  WHERE key = 'email_features';
  IF _inbound_enabled IS NULL THEN _inbound_enabled := true; END IF;
  IF _inbound_enabled = false THEN
    RAISE EXCEPTION 'Email replies are currently disabled. Please contact support directly.';
  END IF;

  SELECT * INTO _thread FROM public.client_email_threads WHERE reply_token = _token;
  IF _thread IS NULL THEN
    RAISE EXCEPTION 'Invalid reply token';
  END IF;

  INSERT INTO public.client_email_replies (thread_id, sender, sender_name, body)
  VALUES (_thread.id, 'client', _thread.client_name, trim(_body))
  RETURNING id INTO _reply_id;

  UPDATE public.client_email_threads
  SET agent_unread_count = agent_unread_count + 1,
      last_reply_at = now(),
      updated_at = now()
  WHERE id = _thread.id;

  _msg := COALESCE(_thread.client_name, _thread.client_email, 'A client') || ' replied to email: "' || left(_thread.subject, 60) || '"';
  INSERT INTO public.notifications (user_id, title, message, type, priority)
  SELECT DISTINCT uid, '✉️ New email reply', _msg, 'email_reply', 3
  FROM (
    SELECT _thread.agent_user_id AS uid WHERE _thread.agent_user_id IS NOT NULL
    UNION
    SELECT ur.user_id AS uid
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name IN ('Admin','Manager')
  ) recipients
  WHERE uid IS NOT NULL;

  RETURN _reply_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.post_client_reply_by_token(TEXT, TEXT) TO anon, authenticated;