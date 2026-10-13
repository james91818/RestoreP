CREATE TABLE public.appointment_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  agent_id UUID,
  preferred_at TIMESTAMP WITH TIME ZONE NOT NULL,
  alternate_at TIMESTAMP WITH TIME ZONE,
  topic TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  agent_response TEXT,
  appointment_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointment_requests_client ON public.appointment_requests(client_id);
CREATE INDEX idx_appointment_requests_agent ON public.appointment_requests(agent_id);
CREATE INDEX idx_appointment_requests_status ON public.appointment_requests(status);

ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their own requests"
ON public.appointment_requests FOR SELECT
USING (auth.uid() = client_id);

CREATE POLICY "Clients can create their own requests"
ON public.appointment_requests FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can cancel their own pending requests"
ON public.appointment_requests FOR UPDATE
USING (auth.uid() = client_id AND status = 'pending')
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Assigned agent can view requests"
ON public.appointment_requests FOR SELECT
USING (auth.uid() = agent_id);

CREATE POLICY "Admins and managers can view all requests"
ON public.appointment_requests FOR SELECT
USING (public.has_role_by_name(_role_name => 'Admin', _user_id => auth.uid())
    OR public.has_role_by_name(_role_name => 'Manager', _user_id => auth.uid()));

CREATE POLICY "Assigned agent can update requests"
ON public.appointment_requests FOR UPDATE
USING (auth.uid() = agent_id)
WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Admins and managers can update all requests"
ON public.appointment_requests FOR UPDATE
USING (public.has_role_by_name(_role_name => 'Admin', _user_id => auth.uid())
    OR public.has_role_by_name(_role_name => 'Manager', _user_id => auth.uid()));

CREATE POLICY "Admins and managers can delete requests"
ON public.appointment_requests FOR DELETE
USING (public.has_role_by_name(_role_name => 'Admin', _user_id => auth.uid())
    OR public.has_role_by_name(_role_name => 'Manager', _user_id => auth.uid()));

CREATE TRIGGER update_appointment_requests_updated_at
BEFORE UPDATE ON public.appointment_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_requests;