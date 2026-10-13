-- Allow clients to read appointments where they are the client
CREATE POLICY "Clients read own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);