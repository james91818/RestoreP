CREATE TABLE public.telegram_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id text NOT NULL,
  telegram_message_id bigint NOT NULL,
  label text NOT NULL DEFAULT '',
  amount_usd numeric NOT NULL,
  raw_text text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chat_id, telegram_message_id)
);

CREATE INDEX idx_telegram_expenses_sent_at ON public.telegram_expenses (sent_at DESC);

GRANT SELECT ON public.telegram_expenses TO authenticated;
GRANT ALL ON public.telegram_expenses TO service_role;

ALTER TABLE public.telegram_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view telegram expenses"
ON public.telegram_expenses
FOR SELECT
TO authenticated
USING (public.has_role_by_name(auth.uid(), 'Admin'));