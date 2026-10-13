CREATE TABLE public.payment_link_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  full_name text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  country text,
  telegram_message_id bigint,
  payment_link text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz
);

ALTER TABLE public.payment_link_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view payment link requests"
ON public.payment_link_requests FOR SELECT TO authenticated
USING (
  public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager')
  OR public.has_role_by_name(auth.uid(), 'Agent')
);

CREATE POLICY "Staff can create payment link requests"
ON public.payment_link_requests FOR INSERT TO authenticated
WITH CHECK (
  public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager')
  OR public.has_role_by_name(auth.uid(), 'Agent')
);

CREATE POLICY "Staff can update payment link requests"
ON public.payment_link_requests FOR UPDATE TO authenticated
USING (
  public.has_role_by_name(auth.uid(), 'Admin')
  OR public.has_role_by_name(auth.uid(), 'Manager')
  OR public.has_role_by_name(auth.uid(), 'Agent')
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_link_requests;