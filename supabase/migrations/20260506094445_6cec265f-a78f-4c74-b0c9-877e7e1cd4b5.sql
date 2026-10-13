
-- Welcome page bank accounts (Austria bank transfer option)
CREATE TABLE public.welcome_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text,
  account_holder text NOT NULL,
  bank_name text NOT NULL,
  iban text NOT NULL,
  bic text,
  reference text,
  country text NOT NULL DEFAULT 'Austria',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.welcome_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read enabled welcome banks"
ON public.welcome_bank_accounts FOR SELECT TO authenticated
USING (enabled = true);

CREATE POLICY "Staff manage welcome banks"
ON public.welcome_bank_accounts FOR ALL TO authenticated
USING (has_permission(auth.uid(), 'users.manage'))
WITH CHECK (has_permission(auth.uid(), 'users.manage'));

CREATE TRIGGER trg_welcome_bank_accounts_updated
BEFORE UPDATE ON public.welcome_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
