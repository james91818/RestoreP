CREATE TABLE public.swaps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.swaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own swaps" ON public.swaps
  FOR SELECT USING (auth.uid() = user_id OR has_permission(auth.uid(), 'users.manage'::text));

CREATE POLICY "Users insert own swaps" ON public.swaps
  FOR INSERT WITH CHECK (auth.uid() = user_id);