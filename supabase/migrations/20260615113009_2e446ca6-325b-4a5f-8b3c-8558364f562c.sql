ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_login_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS auto_login_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_auto_login_token_idx ON public.profiles(auto_login_token);