-- 1) Tighten client deposit inserts
DROP POLICY IF EXISTS "Users insert deposits" ON public.deposits;
CREATE POLICY "Users insert deposits"
ON public.deposits FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND amount > 0
  AND processed_by IS NULL
  AND admin_notes IS NULL
);

-- 2) Server-side guard: non-staff can never create an approved deposit
CREATE OR REPLACE FUNCTION public.guard_deposit_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_permission(auth.uid(), 'deposits.manage') THEN
    NEW.status := 'pending';
    NEW.processed_by := NULL;
    NEW.admin_notes := NULL;
    IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
      RAISE EXCEPTION 'Invalid deposit amount';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_deposit_insert ON public.deposits;
CREATE TRIGGER trg_guard_deposit_insert
BEFORE INSERT ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.guard_deposit_insert();

-- 3) Guard status changes by non-staff (defence in depth)
CREATE OR REPLACE FUNCTION public.guard_deposit_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_permission(auth.uid(), 'deposits.manage') THEN
    NEW.status := OLD.status;
    NEW.amount := OLD.amount;
    NEW.processed_by := OLD.processed_by;
    NEW.admin_notes := OLD.admin_notes;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_deposit_update ON public.deposits;
CREATE TRIGGER trg_guard_deposit_update
BEFORE UPDATE ON public.deposits
FOR EACH ROW EXECUTE FUNCTION public.guard_deposit_update();

-- 4) Wallets: clients may only create empty wallets
DROP POLICY IF EXISTS "Users insert own wallets" ON public.wallets;
CREATE POLICY "Users insert own wallets"
ON public.wallets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND balance = 0);
