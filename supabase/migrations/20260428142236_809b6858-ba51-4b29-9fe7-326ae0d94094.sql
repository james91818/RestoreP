
CREATE OR REPLACE FUNCTION public.notify_client_deposit_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_email text;
  _client_name text;
  _amount_str text;
  _method_label text;
  _date_str text;
  _service_key text;
BEGIN
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  SELECT email, full_name INTO _client_email, _client_name
  FROM public.profiles WHERE id = NEW.user_id;

  IF _client_email IS NULL OR _client_email = '' THEN
    RETURN NEW;
  END IF;

  -- Read service role key from Vault (same one used by email queue)
  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF _service_key IS NULL OR _service_key = '' THEN
    RETURN NEW;
  END IF;

  _amount_str := replace(replace(replace(
    to_char(NEW.amount, 'FM999G999G990D00'),
    ',', '#'), '.', ','), '#', '.');

  _method_label := CASE
    WHEN NEW.method = 'crypto'      THEN 'Krypto'
    WHEN NEW.method = 'bank_wire'   THEN 'Banküberweisung'
    WHEN NEW.method = 'card'        THEN 'Kreditkarte'
    WHEN NEW.method = 'credit_card' THEN 'Kreditkarte'
    ELSE COALESCE(NEW.method, 'Sonstige')
  END;

  _date_str := to_char(now() AT TIME ZONE 'Europe/Berlin', 'DD. Mon YYYY');

  PERFORM net.http_post(
    url := 'https://youzrxpfxslyrsfdjkvm.supabase.co/functions/v1/send-transactional-email',
    body := jsonb_build_object(
      'templateName', 'deposit-approved',
      'recipientEmail', _client_email,
      'idempotencyKey', 'deposit-approved-' || NEW.id::text,
      'templateData', jsonb_build_object(
        'clientName', _client_name,
        'amount', _amount_str,
        'currency', NEW.currency,
        'method', _method_label,
        'depositDate', _date_str
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
