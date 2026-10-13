CREATE TABLE IF NOT EXISTS public.chat_room_reads (
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, staff_id)
);

ALTER TABLE public.chat_room_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own chat reads"
  ON public.chat_room_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = staff_id AND public.has_permission(auth.uid(), 'support.manage'));

CREATE POLICY "Staff insert own chat reads"
  ON public.chat_room_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = staff_id AND public.has_permission(auth.uid(), 'support.manage'));

CREATE POLICY "Staff update own chat reads"
  ON public.chat_room_reads FOR UPDATE
  TO authenticated
  USING (auth.uid() = staff_id AND public.has_permission(auth.uid(), 'support.manage'));

CREATE INDEX IF NOT EXISTS chat_room_reads_staff_idx ON public.chat_room_reads(staff_id);