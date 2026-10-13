
DROP POLICY "Anyone can insert welcome visits" ON public.welcome_page_visits;

CREATE POLICY "Users insert own welcome visits"
  ON public.welcome_page_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
