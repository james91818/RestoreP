-- Add username/password for affiliate API and provenance flag on profiles
ALTER TABLE public.affiliates
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS password text;

CREATE UNIQUE INDEX IF NOT EXISTS affiliates_username_unique
  ON public.affiliates (lower(username))
  WHERE username IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS created_via_affiliate_api boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_affiliate_api_idx
  ON public.profiles (affiliate, created_via_affiliate_api)
  WHERE created_via_affiliate_api = true;