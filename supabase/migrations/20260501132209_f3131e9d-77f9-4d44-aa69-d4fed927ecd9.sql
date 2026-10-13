
CREATE TABLE public.client_page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  title TEXT,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_page_visits_user_visited ON public.client_page_visits (user_id, visited_at DESC);
CREATE INDEX idx_client_page_visits_path ON public.client_page_visits (path);

ALTER TABLE public.client_page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own page visits"
  ON public.client_page_visits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own page visits"
  ON public.client_page_visits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can view all page visits"
  ON public.client_page_visits FOR SELECT
  TO authenticated
  USING (
    public.has_role_by_name(auth.uid(), 'Admin')
    OR public.has_role_by_name(auth.uid(), 'Manager')
    OR public.is_agent_like(auth.uid())
  );
