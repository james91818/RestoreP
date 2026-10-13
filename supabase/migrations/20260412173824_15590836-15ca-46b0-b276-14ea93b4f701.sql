-- Add reminded flag
ALTER TABLE public.appointments ADD COLUMN reminded boolean NOT NULL DEFAULT false;

-- Enable extensions for scheduled cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;