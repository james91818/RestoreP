
CREATE OR REPLACE FUNCTION public.can_view_all_trades(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = _user_id
      AND r.name IN ('Admin','Manager Conversion','Manager Retention')
  );
$$;

DROP POLICY IF EXISTS "Users read own trades" ON public.trades;

CREATE POLICY "Users read own trades"
ON public.trades FOR SELECT
USING (
  auth.uid() = user_id
  OR public.can_view_all_trades(auth.uid())
  OR (
    public.has_permission(auth.uid(), 'trades.view')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = trades.user_id
        AND p.assigned_agent = auth.uid()
    )
  )
);
