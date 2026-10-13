ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS notify_client boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_agent boolean NOT NULL DEFAULT true;

UPDATE public.appointments
SET notify_client = COALESCE(notifications_enabled, true),
    notify_agent = COALESCE(notifications_enabled, true);