
CREATE OR REPLACE FUNCTION public.parse_bonus_note(_content text)
RETURNS TABLE(currency text, amount numeric)
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
DECLARE
  m text[];
  raw text;
  norm text;
BEGIN
  m := regexp_match(COALESCE(_content,''), '🎁 Bonus credited:\s*([A-Z]{3,5})\s*([0-9.,]+)');
  IF m IS NULL THEN RETURN; END IF;
  raw := m[2];
  -- Normalize: if contains ',' but no '.', treat ',' as decimal; else strip ','
  IF position(',' in raw) > 0 AND position('.' in raw) = 0 THEN
    norm := replace(replace(raw, '.', ''), ',', '.');
  ELSE
    norm := replace(raw, ',', '');
  END IF;
  currency := m[1];
  amount := norm::numeric;
  RETURN NEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_wallet_on_bonus_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_b record;
  new_b record;
  delta numeric := 0;
  cur text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO old_b FROM public.parse_bonus_note(OLD.content);
    IF old_b.amount IS NULL THEN RETURN OLD; END IF;
    UPDATE public.wallets
      SET balance = balance - old_b.amount, updated_at = now()
      WHERE user_id = OLD.user_id AND currency = old_b.currency;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT * INTO old_b FROM public.parse_bonus_note(OLD.content);
    SELECT * INTO new_b FROM public.parse_bonus_note(NEW.content);
    -- Only adjust if at least one side is a bonus
    IF old_b.amount IS NULL AND new_b.amount IS NULL THEN RETURN NEW; END IF;
    cur := COALESCE(new_b.currency, old_b.currency);
    delta := COALESCE(new_b.amount, 0) - COALESCE(old_b.amount, 0);
    IF delta <> 0 THEN
      UPDATE public.wallets
        SET balance = balance + delta, updated_at = now()
        WHERE user_id = NEW.user_id AND currency = cur;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_adjust_wallet_on_bonus_change ON public.admin_notes;
CREATE TRIGGER trg_adjust_wallet_on_bonus_change
AFTER UPDATE OR DELETE ON public.admin_notes
FOR EACH ROW
EXECUTE FUNCTION public.adjust_wallet_on_bonus_change();
