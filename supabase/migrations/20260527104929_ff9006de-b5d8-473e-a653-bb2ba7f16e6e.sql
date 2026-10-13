CREATE TABLE public.staff_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  assigned_to uuid,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_tasks TO authenticated;
GRANT ALL ON public.staff_tasks TO service_role;

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff create tasks"
ON public.staff_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (
    has_role_by_name(auth.uid(), 'Admin')
    OR has_role_by_name(auth.uid(), 'Manager')
    OR has_role_by_name(auth.uid(), 'Manager Conversion')
    OR has_role_by_name(auth.uid(), 'Manager Retention')
    OR is_agent_like(auth.uid())
  )
);

CREATE POLICY "Staff read own or admin/manager all tasks"
ON public.staff_tasks
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by
  OR auth.uid() = assigned_to
  OR has_role_by_name(auth.uid(), 'Admin')
  OR has_role_by_name(auth.uid(), 'Manager')
);

CREATE POLICY "Creator can update own pending tasks"
ON public.staff_tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by AND status = 'open')
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and managers update any task"
ON public.staff_tasks
FOR UPDATE
TO authenticated
USING (has_role_by_name(auth.uid(), 'Admin') OR has_role_by_name(auth.uid(), 'Manager'))
WITH CHECK (has_role_by_name(auth.uid(), 'Admin') OR has_role_by_name(auth.uid(), 'Manager'));

CREATE POLICY "Admins and managers delete tasks"
ON public.staff_tasks
FOR DELETE
TO authenticated
USING (has_role_by_name(auth.uid(), 'Admin') OR has_role_by_name(auth.uid(), 'Manager'));

CREATE POLICY "Creator deletes own open task"
ON public.staff_tasks
FOR DELETE
TO authenticated
USING (auth.uid() = created_by AND status = 'open');

CREATE TRIGGER update_staff_tasks_updated_at
BEFORE UPDATE ON public.staff_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_staff_tasks_status ON public.staff_tasks(status);
CREATE INDEX idx_staff_tasks_created_by ON public.staff_tasks(created_by);
CREATE INDEX idx_staff_tasks_created_at ON public.staff_tasks(created_at DESC);