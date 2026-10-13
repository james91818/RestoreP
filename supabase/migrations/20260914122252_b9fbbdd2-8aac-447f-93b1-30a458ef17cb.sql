CREATE TABLE public.pending_retention (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  sent_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','in','settled')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_retention TO authenticated;
GRANT ALL ON public.pending_retention TO service_role;

ALTER TABLE public.pending_retention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view pending retention" ON public.pending_retention
  FOR SELECT TO authenticated USING (public.is_agent_like(auth.uid()));
CREATE POLICY "Staff can insert pending retention" ON public.pending_retention
  FOR INSERT TO authenticated WITH CHECK (public.is_agent_like(auth.uid()));
CREATE POLICY "Staff can update pending retention" ON public.pending_retention
  FOR UPDATE TO authenticated USING (public.is_agent_like(auth.uid())) WITH CHECK (public.is_agent_like(auth.uid()));
CREATE POLICY "Staff can delete pending retention" ON public.pending_retention
  FOR DELETE TO authenticated USING (public.is_agent_like(auth.uid()));

CREATE TRIGGER update_pending_retention_updated_at
  BEFORE UPDATE ON public.pending_retention
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_pending_retention_sent_date ON public.pending_retention (sent_date DESC);