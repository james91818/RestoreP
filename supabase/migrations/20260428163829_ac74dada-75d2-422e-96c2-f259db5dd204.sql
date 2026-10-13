-- 1. Add currency + network columns to pool
ALTER TABLE public.btc_address_pool
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BTC',
  ADD COLUMN IF NOT EXISTS network  text NOT NULL DEFAULT 'Bitcoin';

-- Backfill any existing rows explicitly
UPDATE public.btc_address_pool SET currency = 'BTC', network = 'Bitcoin'
WHERE currency IS NULL OR network IS NULL;

-- 2. Replace the global unique(address) constraint (if exists) with a composite one per (currency, network, address)
DO $$
DECLARE _c text;
BEGIN
  SELECT conname INTO _c
  FROM pg_constraint
  WHERE conrelid = 'public.btc_address_pool'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) ILIKE '%(address)%'
    AND pg_get_constraintdef(oid) NOT ILIKE '%currency%';
  IF _c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.btc_address_pool DROP CONSTRAINT %I', _c);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS btc_address_pool_unique_addr
  ON public.btc_address_pool (currency, network, address);

CREATE INDEX IF NOT EXISTS btc_address_pool_available_idx
  ON public.btc_address_pool (currency, network, created_at)
  WHERE is_used = false;

-- 3. Replace the auto-assign trigger to handle BTC, USDT-TRC20, USDT-ERC20
CREATE OR REPLACE FUNCTION public.auto_assign_btc_address_on_ftd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _client record;
  _label text;
  _asset record;
  _pool_row record;
  _has_addr boolean;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  SELECT full_name, email INTO _client FROM public.profiles WHERE id = NEW.user_id;
  _label := COALESCE(NULLIF(_client.full_name, ''), _client.email, 'Client');

  -- Iterate over supported assets
  FOR _asset IN
    SELECT * FROM (VALUES
      ('BTC',  'Bitcoin'),
      ('USDT', 'TRC20'),
      ('USDT', 'ERC20')
    ) AS t(currency, network)
  LOOP
    -- Skip if client already has an address for this currency+network
    SELECT EXISTS (
      SELECT 1 FROM public.client_crypto_addresses
      WHERE user_id = NEW.user_id
        AND upper(currency) = upper(_asset.currency)
        AND COALESCE(network, '') = _asset.network
    ) INTO _has_addr;

    IF _has_addr THEN CONTINUE; END IF;

    -- Pick next available address from the matching pool (FIFO)
    SELECT * INTO _pool_row
    FROM public.btc_address_pool
    WHERE is_used = false
      AND currency = _asset.currency
      AND network  = _asset.network
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF _pool_row IS NULL THEN
      -- Notify staff that this specific pool is empty
      INSERT INTO public.notifications (user_id, title, message, type, priority)
      SELECT DISTINCT ur.user_id,
             '⚠️ ' || _asset.currency || ' (' || _asset.network || ') pool empty',
             'A client just converted but no ' || _asset.currency || ' (' || _asset.network ||
             ') address is available. Please import more from Sparrow.',
             'warning', 3
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE r.name IN ('Admin', 'Manager');
      CONTINUE;
    END IF;

    -- Attach to client
    INSERT INTO public.client_crypto_addresses (user_id, currency, address, network, label)
    VALUES (NEW.user_id, _asset.currency, _pool_row.address, _asset.network,
            'Auto-assigned: ' || _label);

    -- Mark pool entry as used
    UPDATE public.btc_address_pool
    SET is_used = true,
        assigned_to = NEW.user_id,
        assigned_at = now()
    WHERE id = _pool_row.id;
  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$function$;