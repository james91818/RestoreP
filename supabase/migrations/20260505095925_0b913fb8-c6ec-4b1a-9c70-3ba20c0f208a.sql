
ALTER TABLE public.client_crypto_addresses DROP CONSTRAINT IF EXISTS client_crypto_addresses_user_id_currency_key;
ALTER TABLE public.client_crypto_addresses ADD CONSTRAINT client_crypto_addresses_user_currency_network_key UNIQUE (user_id, currency, network);
