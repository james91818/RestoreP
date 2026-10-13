CREATE TABLE public.blocked_ips (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip text NOT NULL UNIQUE,
  reason text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blocked_ips TO authenticated;
GRANT ALL ON public.blocked_ips TO service_role;

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view blocked ips"
ON public.blocked_ips FOR SELECT TO authenticated
USING (public.has_permission(auth.uid(), 'users.manage'));

-- Reject and log tampering instead of silently correcting it
CREATE OR REPLACE FUNCTION public.guard_deposit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_permission(auth.uid(), 'deposits.manage') THEN
    IF COALESCE(NEW.status, 'pending') <> 'pending'
       OR NEW.processed_by IS NOT NULL
       OR NEW.admin_notes IS NOT NULL
       OR NEW.user_id <> auth.uid() THEN
      INSERT INTO public.activity_log (user_id, action, details)
      VALUES (auth.uid(), 'abuse_deposit_tamper',
              jsonb_build_object('status', NEW.status, 'amount', NEW.amount, 'target_user', NEW.user_id));
      RAISE EXCEPTION 'ABUSE_BLOCKED: deposit tampering attempt';
    END IF;
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Invalid deposit amount';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_deposit_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_permission(auth.uid(), 'deposits.manage') THEN
    IF NEW.status IS DISTINCT FROM OLD.status
       OR NEW.amount IS DISTINCT FROM OLD.amount
       OR NEW.processed_by IS DISTINCT FROM OLD.processed_by
       OR NEW.admin_notes IS DISTINCT FROM OLD.admin_notes THEN
      INSERT INTO public.activity_log (user_id, action, details)
      VALUES (auth.uid(), 'abuse_deposit_tamper',
              jsonb_build_object('deposit_id', OLD.id, 'old_status', OLD.status, 'new_status', NEW.status));
      RAISE EXCEPTION 'ABUSE_BLOCKED: deposit tampering attempt';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
