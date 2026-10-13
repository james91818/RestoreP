
-- Fix 1: Remove the dangerous "Users update own wallets" policy that allows users to set arbitrary balances
DROP POLICY IF EXISTS "Users update own wallets" ON public.wallets;

-- Fix 2: Update chat_messages INSERT policy to verify room membership
DROP POLICY IF EXISTS "Chat participants insert" ON public.chat_messages;
CREATE POLICY "Chat participants insert" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.room_id::uuid
      AND (cr.user_id = auth.uid() OR cr.agent_id = auth.uid() OR has_permission(auth.uid(), 'support.manage'))
    )
  );

-- Fix 3: Also fix chat_messages SELECT so users can see all messages in their own rooms (not just their own messages)
DROP POLICY IF EXISTS "Chat participants read" ON public.chat_messages;
CREATE POLICY "Chat participants read" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.room_id::uuid
      AND (cr.user_id = auth.uid() OR cr.agent_id = auth.uid() OR has_permission(auth.uid(), 'support.manage'))
    )
  );
