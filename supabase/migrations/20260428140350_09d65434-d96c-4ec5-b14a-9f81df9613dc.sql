-- Trigger to notify staff on every new deposit request, regardless of source.
-- Runs with SECURITY DEFINER so it bypasses the notifications RLS insert policy
-- (which would normally block clients from inserting notifications for staff).

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
    ELSE COALESCE(NEW.method, 'unknown')
  END;

  _msg := '💰 ' || _label || ' submitted a ' || NEW.currency || ' '
          || trim(both '0' from to_char(NEW.amount, 'FM999G999G999D00'))
          || ' deposit via ' || _method_label || '.';

  -- Insert notifications for assigned + ftd agent + every Admin/Manager
  INSERT INTO public.notifications (user_id, title, message, type, priority)
  SELECT DISTINCT uid, '💰 New deposit request', _msg, 'deposit', 3
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
  WHERE uid IS NOT NULL AND uid <> NEW.user_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the deposit insert if notification fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_deposit_notify_staff ON public.deposits;
CREATE TRIGGER on_deposit_notify_staff
AFTER INSERT ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.notify_staff_new_deposit();