CREATE TABLE public._restore_stage (id serial PRIMARY KEY, sql text NOT NULL);
GRANT ALL ON public._restore_stage TO service_role;
GRANT INSERT, SELECT ON public._restore_stage TO sandbox_exec;
GRANT USAGE ON SEQUENCE public._restore_stage_id_seq TO sandbox_exec;
ALTER TABLE public._restore_stage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sandbox insert" ON public._restore_stage FOR ALL TO sandbox_exec USING (true) WITH CHECK (true);