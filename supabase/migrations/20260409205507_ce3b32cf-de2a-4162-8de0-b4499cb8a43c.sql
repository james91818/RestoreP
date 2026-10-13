
CREATE TABLE public.welcome_page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  visitor_email TEXT,
  visitor_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  landed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  timer_expired BOOLEAN DEFAULT false,
  country TEXT,
  device_type TEXT
);

ALTER TABLE public.welcome_page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read welcome visits"
  ON public.welcome_page_visits
  FOR SELECT
  TO authenticated
  USING (has_permission(auth.uid(), 'users.manage'));

CREATE POLICY "Anyone can insert welcome visits"
  ON public.welcome_page_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update own visit"
  ON public.welcome_page_visits
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_welcome_visits_landed_at ON public.welcome_page_visits (landed_at DESC);
CREATE INDEX idx_welcome_visits_user_id ON public.welcome_page_visits (user_id);
