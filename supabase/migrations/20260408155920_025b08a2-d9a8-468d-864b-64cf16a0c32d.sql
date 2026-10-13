
-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'ai',
  agent_id uuid,
  status text NOT NULL DEFAULT 'open',
  subject text DEFAULT 'Live Chat',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Clients read own rooms
CREATE POLICY "Users read own chat rooms"
ON public.chat_rooms FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Clients create own rooms
CREATE POLICY "Users create own chat rooms"
ON public.chat_rooms FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Staff read all rooms
CREATE POLICY "Staff read all chat rooms"
ON public.chat_rooms FOR SELECT
TO authenticated
USING (has_permission(auth.uid(), 'support.manage'));

-- Staff update rooms
CREATE POLICY "Staff update chat rooms"
ON public.chat_rooms FOR UPDATE
TO authenticated
USING (has_permission(auth.uid(), 'support.manage'));

-- Clients update own rooms (for closing)
CREATE POLICY "Users update own chat rooms"
ON public.chat_rooms FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_chat_rooms_updated_at
BEFORE UPDATE ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
