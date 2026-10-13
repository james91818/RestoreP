DROP POLICY IF EXISTS "Staff insert trades" ON public.trades;
CREATE POLICY "Staff insert trades" ON public.trades
FOR INSERT TO authenticated
WITH CHECK (
  has_permission(auth.uid(), 'trades.manage')
  OR (
    has_permission(auth.uid(), 'trades.view')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = trades.user_id AND p.assigned_agent = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Staff can delete trades" ON public.trades;
CREATE POLICY "Staff can delete trades" ON public.trades
FOR DELETE TO authenticated
USING (
  has_permission(auth.uid(), 'trades.manage')
  OR (
    has_permission(auth.uid(), 'trades.view')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = trades.user_id AND p.assigned_agent = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Staff update trades" ON public.trades;
CREATE POLICY "Staff update trades" ON public.trades
FOR UPDATE TO authenticated
USING (
  has_permission(auth.uid(), 'trades.manage')
  OR (
    has_permission(auth.uid(), 'trades.view')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = trades.user_id AND p.assigned_agent = auth.uid()
    )
  )
)
WITH CHECK (
  has_permission(auth.uid(), 'trades.manage')
  OR (
    has_permission(auth.uid(), 'trades.view')
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = trades.user_id AND p.assigned_agent = auth.uid()
    )
  )
);