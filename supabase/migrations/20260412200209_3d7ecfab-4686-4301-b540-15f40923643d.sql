
CREATE OR REPLACE FUNCTION public.auto_assign_agent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings jsonb;
  _mode text;
  _agent_id uuid;
  _pool jsonb;
  _pool_len int;
  _rr_idx int;
  _affiliate_mapping jsonb;
  _funnel_rules jsonb;
  _country_rules jsonb;
  _rule jsonb;
BEGIN
  -- Only process leads
  IF NEW.is_lead IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Get auto_assign settings
  SELECT value INTO _settings FROM public.platform_settings WHERE key = 'auto_assign';
  IF _settings IS NULL THEN
    RETURN NEW;
  END IF;

  _mode := _settings->>'mode';
  IF _mode IS NULL OR _mode = 'none' THEN
    RETURN NEW;
  END IF;

  -- Priority 1: Affiliate mapping
  IF NEW.affiliate IS NOT NULL AND _settings->'affiliate_mapping' IS NOT NULL THEN
    _agent_id := (_settings->'affiliate_mapping'->>NEW.affiliate)::uuid;
    IF _agent_id IS NOT NULL THEN
      NEW.assigned_agent := _agent_id;
      RETURN NEW;
    END IF;
  END IF;

  -- Priority 2: Funnel rules
  IF NEW.funnel IS NOT NULL AND _settings->'funnel_rules' IS NOT NULL THEN
    FOR _rule IN SELECT * FROM jsonb_array_elements(_settings->'funnel_rules')
    LOOP
      IF lower(NEW.funnel) = lower(_rule->>'funnel') AND _rule->>'agent_id' IS NOT NULL AND _rule->>'agent_id' != '' THEN
        NEW.assigned_agent := (_rule->>'agent_id')::uuid;
        RETURN NEW;
      END IF;
    END LOOP;
  END IF;

  -- Priority 3: Country rules
  IF NEW.country IS NOT NULL AND _settings->'country_rules' IS NOT NULL THEN
    FOR _rule IN SELECT * FROM jsonb_array_elements(_settings->'country_rules')
    LOOP
      IF lower(NEW.country) = lower(_rule->>'country') AND _rule->>'agent_id' IS NOT NULL AND _rule->>'agent_id' != '' THEN
        NEW.assigned_agent := (_rule->>'agent_id')::uuid;
        RETURN NEW;
      END IF;
    END LOOP;
  END IF;

  -- Default: Fixed mode
  IF _mode = 'fixed' THEN
    _agent_id := (_settings->>'default_agent')::uuid;
    IF _agent_id IS NOT NULL THEN
      NEW.assigned_agent := _agent_id;
    END IF;
    RETURN NEW;
  END IF;

  -- Default: Round robin
  IF _mode = 'round_robin' THEN
    _pool := _settings->'agent_pool';
    IF _pool IS NOT NULL AND jsonb_array_length(_pool) > 0 THEN
      _pool_len := jsonb_array_length(_pool);
      _rr_idx := COALESCE((_settings->>'rr_index')::int, 0) % _pool_len;
      _agent_id := (_pool->>_rr_idx)::uuid;
      NEW.assigned_agent := _agent_id;
      -- Advance round robin index
      UPDATE public.platform_settings
      SET value = jsonb_set(_settings, '{rr_index}', to_jsonb((_rr_idx + 1) % _pool_len))
      WHERE key = 'auto_assign';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on profiles BEFORE INSERT
CREATE TRIGGER trg_auto_assign_agent
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_agent();
