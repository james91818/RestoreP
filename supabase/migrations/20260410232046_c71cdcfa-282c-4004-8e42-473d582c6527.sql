CREATE POLICY "Users can read own welcome visits"
ON public.welcome_page_visits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());