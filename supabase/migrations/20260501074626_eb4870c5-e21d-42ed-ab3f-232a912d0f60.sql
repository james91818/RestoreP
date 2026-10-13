-- Threads: one per custom email sent
CREATE TABLE public.client_email_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_user_id UUID NOT NULL,
  client_email TEXT NOT NULL,
  client_name TEXT,
  agent_user_id UUID,
  agent_name TEXT,
  agent_email TEXT,
  from_address TEXT,
  from_label TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  reply_token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  agent_unread_count INTEGER NOT NULL DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cet_client ON public.client_email_threads(client_user_id);
CREATE INDEX idx_cet_agent ON public.client_email_threads(agent_user_id);
CREATE INDEX idx_cet_token ON public.client_email_threads(reply_token);
CREATE INDEX idx_cet_unread ON public.client_email_threads(agent_unread_count) WHERE agent_unread_count > 0;

-- Replies
CREATE TABLE public.client_email_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.client_email_threads(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('client','agent')),
  sender_user_id UUID,
  sender_name TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cer_thread ON public.client_email_replies(thread_id, created_at);

-- Enable RLS
ALTER TABLE public.client_email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_email_replies ENABLE ROW LEVEL SECURITY;

-- Staff can do everything
CREATE POLICY "Staff full access threads"
ON public.client_email_threads
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('Admin','Manager','Agent','Agent Conversion','Agent Retention','Manager Conversion')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('Admin','Manager','Agent','Agent Conversion','Agent Retention','Manager Conversion')
  )
);

CREATE POLICY "Staff full access replies"
ON public.client_email_replies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('Admin','Manager','Agent','Agent Conversion','Agent Retention','Manager Conversion')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name IN ('Admin','Manager','Agent','Agent Conversion','Agent Retention','Manager Conversion')
  )
);

-- Clients can view their own threads and replies (when logged in)
CREATE POLICY "Clients view own threads"
ON public.client_email_threads
FOR SELECT
USING (auth.uid() = client_user_id);

CREATE POLICY "Clients view own replies"
ON public.client_email_replies
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_email_threads t
    WHERE t.id = thread_id AND t.client_user_id = auth.uid()
  )
);

-- Public reply via secure token (RPC functions, security definer)
CREATE OR REPLACE FUNCTION public.get_email_thread_by_token(_token TEXT)
RETURNS TABLE (
  thread_id UUID,
  subject TEXT,
  body_text TEXT,
  agent_name TEXT,
  agent_email TEXT,
  client_name TEXT,
  client_email TEXT,
  created_at TIMESTAMPTZ,
  replies JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.subject,
    t.body_text,
    t.agent_name,
    t.agent_email,
    t.client_name,
    t.client_email,
    t.created_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', r.id,
        'sender', r.sender,
        'sender_name', r.sender_name,
        'body', r.body,
        'created_at', r.created_at
      ) ORDER BY r.created_at ASC)
       FROM public.client_email_replies r
       WHERE r.thread_id = t.id),
      '[]'::jsonb
    )
  FROM public.client_email_threads t
  WHERE t.reply_token = _token
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.post_client_reply_by_token(_token TEXT, _body TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _thread record;
  _reply_id UUID;
  _msg TEXT;
BEGIN
  IF _body IS NULL OR length(trim(_body)) = 0 THEN
    RAISE EXCEPTION 'Reply body cannot be empty';
  END IF;
  IF length(_body) > 10000 THEN
    RAISE EXCEPTION 'Reply too long';
  END IF;

  SELECT * INTO _thread FROM public.client_email_threads WHERE reply_token = _token;
  IF _thread IS NULL THEN
    RAISE EXCEPTION 'Invalid reply token';
  END IF;

  INSERT INTO public.client_email_replies (thread_id, sender, sender_name, body)
  VALUES (_thread.id, 'client', _thread.client_name, trim(_body))
  RETURNING id INTO _reply_id;

  UPDATE public.client_email_threads
  SET agent_unread_count = agent_unread_count + 1,
      last_reply_at = now(),
      updated_at = now()
  WHERE id = _thread.id;

  -- Notify assigned agent + admins/managers
  _msg := COALESCE(_thread.client_name, _thread.client_email, 'A client') || ' replied to email: "' || left(_thread.subject, 60) || '"';
  INSERT INTO public.notifications (user_id, title, message, type, priority)
  SELECT DISTINCT uid, '✉️ New email reply', _msg, 'email_reply', 3
  FROM (
    SELECT _thread.agent_user_id AS uid WHERE _thread.agent_user_id IS NOT NULL
    UNION
    SELECT ur.user_id AS uid
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE r.name IN ('Admin','Manager')
  ) recipients
  WHERE uid IS NOT NULL;

  RETURN _reply_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_thread_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.post_client_reply_by_token(TEXT, TEXT) TO anon, authenticated;

-- Updated_at trigger
CREATE TRIGGER set_cet_updated_at
BEFORE UPDATE ON public.client_email_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_email_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_email_replies;