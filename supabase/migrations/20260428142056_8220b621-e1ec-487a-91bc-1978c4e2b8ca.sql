
CREATE OR REPLACE FUNCTION public.notify_staff_new_deposit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_name text;
  _client_email text;
  _assigned_agent uuid;
  _ftd_agent uuid;
  _label text;
  _method_label text;
  _msg text;
  _title text;
  _is_manual boolean;
BEGIN
  -- Look up client info
  SELECT full_name, email, assigned_agent, ftd_agent
    INTO _client_name, _client_email, _assigned_agent, _ftd_agent
  FROM public.profiles
  WHERE id = NEW.user_id;

  _label := COALESCE(NULLIF(_client_name, ''), _client_email, 'A client');
  _method_label := CASE
    WHEN NEW.method = 'crypto' THEN 'crypto'
    WHEN NEW.method = 'bank_wire' THEN 'bank wire'
    WHEN NEW.method = 'card' THEN 'card'
    WHEN NEW.method = 'credit_card' THEN 'card'
    ELSE COALESCE(NEW.method, 'unknown')
  END;

  -- Manual deposit = inserted directly as approved by an admin
  _is_manual := (NEW.status = 'approved' AND NEW.processed_by IS NOT NULL);

  IF _is_manual THEN
    _title := '💰 New manual deposit';
    _msg := '💰 ' || _label || ' — manual deposit of ' || NEW.currency || ' '
            || trim(both '0' from to_char(NEW.amount, 'FM999G999G999D00'))
            || ' via ' || _method_label || '.';
  ELSE
    _title := '💰 New deposit request';
    _msg := '💰 ' || _label || ' submitted a ' || NEW.currency || ' '
            || trim(both '0' from to_char(NEW.amount, 'FM999G999G999D00'))
            || ' deposit via ' || _method_label || '.';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, priority)
  SELECT DISTINCT uid, _title, _msg, 'deposit', 3
  FROM (
    SELECT _assigned_agent AS uid WHERE _assigned_agent IS NOT NULL
    UNION
    SELECT _ftd_agent AS uid WHERE _ftd_agent IS NOT NULL
    UNION
    SELECT ur.user_id AS uid
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name IN ('Admin', 'Manager')
  ) recipients
  WHERE uid IS NOT NULL AND uid <> NEW.user_id AND uid <> COALESCE(NEW.processed_by, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
