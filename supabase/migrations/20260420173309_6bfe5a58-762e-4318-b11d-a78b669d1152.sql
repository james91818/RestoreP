-- Allow staff with trades.manage permission to delete trades
CREATE POLICY "Staff can delete trades"
ON public.trades
FOR DELETE
TO authenticated
USING (public.has_permission(auth.uid(), 'trades.manage'));