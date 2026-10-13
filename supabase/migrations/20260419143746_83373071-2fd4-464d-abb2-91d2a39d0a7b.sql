-- Telegram message send log
CREATE TABLE public.telegram_message_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_type TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  message_preview TEXT,
  telegram_message_id BIGINT,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_message_log_created ON public.telegram_message_log (created_at DESC);
CREATE INDEX idx_telegram_message_log_type ON public.telegram_message_log (notification_type);

ALTER TABLE public.telegram_message_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read telegram message log"
ON public.telegram_message_log
FOR SELECT
TO authenticated
USING (has_role_by_name(auth.uid(), 'Admin'));

CREATE POLICY "Service role can insert telegram message log"
ON public.telegram_message_log
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- Seed default Telegram bot configuration
INSERT INTO public.platform_settings (key, value)
VALUES (
  'telegram_bot',
  jsonb_build_object(
    'leads', jsonb_build_object('enabled', true, 'chat_id', '-5268392339'),
    'ftd', jsonb_build_object('enabled', true, 'chat_id', '-5039011876'),
    'payment_links', jsonb_build_object('enabled', true, 'chat_id', '-5289330397')
  )
)
ON CONFLICT (key) DO NOTHING;