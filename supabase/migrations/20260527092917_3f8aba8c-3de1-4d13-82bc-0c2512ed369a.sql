-- Allow users to claim their own unlocked stakes (only flip `claimed` to true after the lock period).
CREATE POLICY "Users claim own unlocked stakes"
ON public.user_stakes
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND claimed = false
  AND unlocks_at <= now()
)
WITH CHECK (
  auth.uid() = user_id
  AND claimed = true
);