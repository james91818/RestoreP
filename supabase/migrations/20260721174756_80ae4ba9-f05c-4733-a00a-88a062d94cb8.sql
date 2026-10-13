
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pbx_extension text;

ALTER TABLE public.phone_call_log
  ADD COLUMN IF NOT EXISTS pbx_call_id text,
  ADD COLUMN IF NOT EXISTS pbx_uniqueid text,
  ADD COLUMN IF NOT EXISTS recording_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS disposition text;

CREATE INDEX IF NOT EXISTS idx_phone_call_log_pbx_call_id ON public.phone_call_log(pbx_call_id);
CREATE INDEX IF NOT EXISTS idx_phone_call_log_pbx_uniqueid ON public.phone_call_log(pbx_uniqueid);
