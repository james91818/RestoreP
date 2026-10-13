
CREATE TABLE public.stripe_checkout_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount_eur NUMERIC NOT NULL,
  stripe_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  source TEXT DEFAULT 'welcome_page',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

ALTER TABLE public.stripe_checkout_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own checkout intents"
  ON public.stripe_checkout_intents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own checkout intents"
  ON public.stripe_checkout_intents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Staff read all checkout intents"
  ON public.stripe_checkout_intents FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Staff update checkout intents"
  ON public.stripe_checkout_intents FOR UPDATE
  TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

CREATE INDEX idx_checkout_intents_user_id ON public.stripe_checkout_intents (user_id);
CREATE INDEX idx_checkout_intents_status ON public.stripe_checkout_intents (status);
CREATE INDEX idx_checkout_intents_created ON public.stripe_checkout_intents (created_at DESC);

CREATE TRIGGER set_checkout_intents_updated_at
  BEFORE UPDATE ON public.stripe_checkout_intents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.stripe_checkout_intents;
