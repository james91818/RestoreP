-- BTC address pool table
CREATE TABLE public.btc_address_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL UNIQUE,
  external_id text,
  label text,
  is_used boolean NOT NULL DEFAULT false,
  assigned_to uuid,
  assigned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_btc_pool_available ON public.btc_address_pool (is_used, created_at) WHERE is_used = false;
CREATE INDEX idx_btc_pool_assigned_to ON public.btc_address_pool (assigned_to);

ALTER TABLE public.btc_address_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and Managers manage btc pool"
ON public.btc_address_pool
FOR ALL
TO authenticated
USING (has_role_by_name(auth.uid(), 'Admin') OR has_role_by_name(auth.uid(), 'Manager'))
WITH CHECK (has_role_by_name(auth.uid(), 'Admin') OR has_role_by_name(auth.uid(), 'Manager'));

-- Auto-assign BTC address on first approved deposit
CREATE OR REPLACE FUNCTION public.auto_assign_btc_address_on_ftd()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_btc boolean;
  _pool_row record;
  _client record;
  _label text;
BEGIN
  -- Only on approved deposits
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Skip if client already has a BTC address attached
  SELECT EXISTS (
    SELECT 1 FROM public.client_crypto_addresses
    WHERE user_id = NEW.user_id AND upper(currency) = 'BTC'
  ) INTO _has_btc;

  IF _has_btc THEN
    RETURN NEW;
  END IF;

  -- Pick next available address (FIFO)
  SELECT * INTO _pool_row
  FROM public.btc_address_pool
  WHERE is_used = false
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF _pool_row IS NULL THEN
    -- Pool empty: notify admins and managers
    INSERT INTO public.notifications (user_id, title, message, type, priority)
    SELECT DISTINCT ur.user_id,
           '⚠️ BTC Address Pool Empty',
           'A client just converted but no BTC address is available. Please import more addresses from Sparrow.',
           'warning',
           3
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name IN ('Admin', 'Manager');
    RETURN NEW;
  END IF;

  -- Get client name for label
  SELECT full_name, email INTO _client FROM public.profiles WHERE id = NEW.user_id;
  _label := COALESCE(NULLIF(_client.full_name, ''), _client.email, 'Client');

  -- Attach to client
  INSERT INTO public.client_crypto_addresses (user_id, currency, address, network, label)
  VALUES (NEW.user_id, 'BTC', _pool_row.address, 'Bitcoin', 'Auto-assigned: ' || _label);

  -- Mark pool entry as used
  UPDATE public.btc_address_pool
  SET is_used = true,
      assigned_to = NEW.user_id,
      assigned_at = now()
  WHERE id = _pool_row.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_btc_address
AFTER INSERT OR UPDATE OF status ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_btc_address_on_ftd();