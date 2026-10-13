CREATE TABLE public.payment_link_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'max_stripe',
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  url TEXT NOT NULL,
  label TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_link_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view payment link presets"
ON public.payment_link_presets FOR SELECT
TO authenticated
USING (
  public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager')
  OR public.has_role_by_name(auth.uid(), 'Agent')
);

CREATE POLICY "Admins and Managers can insert payment link presets"
ON public.payment_link_presets FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager')
);

CREATE POLICY "Admins and Managers can update payment link presets"
ON public.payment_link_presets FOR UPDATE
TO authenticated
USING (
  public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager')
);

CREATE POLICY "Admins and Managers can delete payment link presets"
ON public.payment_link_presets FOR DELETE
TO authenticated
USING (
  public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager')
);

CREATE TRIGGER update_payment_link_presets_updated_at
BEFORE UPDATE ON public.payment_link_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.payment_link_presets (provider, amount, currency, url, sort_order) VALUES
  ('max_stripe', 250,  'EUR', 'https://buy.stripe.com/4gM28l7Wx7JddNogW02Ry08', 1),
  ('max_stripe', 500,  'EUR', 'https://buy.stripe.com/cNi9AN3Gh3sX9x86hm2Ry09', 2),
  ('max_stripe', 750,  'EUR', 'https://buy.stripe.com/bJe9AN5Op2oT5gS35a2Ry0a', 3),
  ('max_stripe', 1000, 'EUR', 'https://buy.stripe.com/bJebIV7Wx7Jd9x849e2Ry0b', 4);