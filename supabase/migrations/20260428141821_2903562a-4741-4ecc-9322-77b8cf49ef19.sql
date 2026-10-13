
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
BEGIN
  -- Only fire when status becomes 'approved'
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

  -- Format amount in de-DE style (10.000,00)
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
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXpyeHBmeHNseXJzZmRqa3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjc3MzcsImV4cCI6MjA4OTk0MzczN30.bGRHyryet1qfTuiGrFjMHqpC3oinVvAsjUYxPzhGqaQ'
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the deposit operation if email fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_client_deposit_approved ON public.deposits;
CREATE TRIGGER trg_notify_client_deposit_approved
  AFTER INSERT OR UPDATE OF status ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_client_deposit_approved();
