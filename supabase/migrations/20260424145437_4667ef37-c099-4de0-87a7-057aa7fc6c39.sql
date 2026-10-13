
CREATE TABLE public.phone_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  phone_number text NOT NULL,
  prefix text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_call_log_client ON public.phone_call_log(client_id, created_at DESC);
CREATE INDEX idx_phone_call_log_agent ON public.phone_call_log(agent_id, created_at DESC);

ALTER TABLE public.phone_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff insert phone call log"
ON public.phone_call_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = agent_id AND has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Staff read phone call log"
ON public.phone_call_log FOR SELECT TO authenticated
USING (
  (has_permission(auth.uid(), 'users.manage') AND NOT is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()))
  OR (is_conversion_only(auth.uid()) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = phone_call_log.client_id
    AND (((p.is_lead = false) AND (p.ftd_agent = auth.uid())) OR ((p.is_lead = true) AND (p.assigned_agent = auth.uid())))
  ))
  OR (is_agent_like(auth.uid()) AND NOT is_conversion_only(auth.uid()) AND EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = phone_call_log.client_id AND p.assigned_agent = auth.uid()
  ))
);
