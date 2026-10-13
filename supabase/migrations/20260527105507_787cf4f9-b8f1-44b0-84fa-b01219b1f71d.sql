ALTER TABLE public.staff_tasks
  ADD COLUMN IF NOT EXISTS admin_unread boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS creator_unread boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_staff_tasks_admin_unread ON public.staff_tasks(admin_unread) WHERE admin_unread = true;
CREATE INDEX IF NOT EXISTS idx_staff_tasks_creator_unread ON public.staff_tasks(creator_unread) WHERE creator_unread = true;