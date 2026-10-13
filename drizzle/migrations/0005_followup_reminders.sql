ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assigned_at timestamptz;
UPDATE public.profiles SET assigned_at = COALESCE(updated_at, created_at) WHERE assigned_agent IS NOT NULL AND assigned_at IS NULL;

CREATE OR REPLACE FUNCTION public.set_assigned_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.assigned_agent IS NOT NULL AND NEW.assigned_at IS NULL THEN NEW.assigned_at := now(); END IF;
  ELSIF NEW.assigned_agent IS DISTINCT FROM OLD.assigned_agent THEN
    NEW.assigned_at := CASE WHEN NEW.assigned_agent IS NULL THEN NULL ELSE now() END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_set_assigned_at ON public.profiles;
CREATE TRIGGER trg_set_assigned_at BEFORE INSERT OR UPDATE OF assigned_agent ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_assigned_at();

CREATE INDEX IF NOT EXISTS idx_admin_notes_user_author_created ON public.admin_notes(user_id, author_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_followup_status(_scope text DEFAULT 'mine')
RETURNS TABLE(customer_id uuid, full_name text, email text, status text, display_id integer, is_lead boolean,
  agent_id uuid, agent_name text, last_activity_at timestamptz, has_comment boolean, hours_since numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _all boolean := false;
BEGIN
  IF _uid IS NULL OR NOT public.is_staff_member(_uid) THEN RETURN; END IF;
  IF _scope = 'all' AND public.has_permission(_uid, 'users.manage')
     AND NOT public.is_agent_like(_uid) AND NOT public.is_conversion_only(_uid) THEN
    _all := true;
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.email, p.status, p.display_id, p.is_lead, p.assigned_agent, a.full_name,
    COALESCE(n.last_at, p.assigned_at, p.created_at), n.last_at IS NOT NULL,
    round((extract(epoch FROM now() - COALESCE(n.last_at, p.assigned_at, p.created_at)) / 3600)::numeric, 1)
  FROM public.profiles p
  LEFT JOIN public.profiles a ON a.id = p.assigned_agent
  LEFT JOIN LATERAL (SELECT max(an.created_at) last_at FROM public.admin_notes an
                     WHERE an.user_id = p.id AND an.author_id = p.assigned_agent) n ON true
  WHERE p.assigned_agent IS NOT NULL
    AND (_all OR p.assigned_agent = _uid)
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id)
    AND COALESCE(p.status,'') NOT IN ('Fake','Test','Invalid','Rejected','Wrong Number','Wrong Details','Refunded','Archived','Inactive','Deleted');
END $$;
REVOKE ALL ON FUNCTION public.get_followup_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_followup_status(text) TO authenticated;