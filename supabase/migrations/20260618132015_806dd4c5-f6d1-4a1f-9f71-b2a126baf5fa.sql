-- Backup table (immutable history)
CREATE TABLE public.presencas_backup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operacao text NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  presenca_id uuid NOT NULL,
  user_id uuid NOT NULL,
  student_id uuid,
  disciplina_id uuid,
  turma_id uuid,
  data date,
  status text,
  justificativa text,
  snapshot jsonb NOT NULL,
  backed_up_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_presencas_backup_user ON public.presencas_backup(user_id, backed_up_at DESC);
CREATE INDEX idx_presencas_backup_presenca ON public.presencas_backup(presenca_id);
CREATE INDEX idx_presencas_backup_disciplina ON public.presencas_backup(disciplina_id, data);

GRANT SELECT, INSERT ON public.presencas_backup TO authenticated;
GRANT ALL ON public.presencas_backup TO service_role;

ALTER TABLE public.presencas_backup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own backup"
  ON public.presencas_backup FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System inserts backup"
  ON public.presencas_backup FOR INSERT
  WITH CHECK (true);

-- No UPDATE / DELETE policies => backup is append-only and immutable.

-- Trigger function
CREATE OR REPLACE FUNCTION public.fn_backup_presenca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  INSERT INTO public.presencas_backup(
    operacao, presenca_id, user_id, student_id, disciplina_id,
    turma_id, data, status, justificativa, snapshot
  ) VALUES (
    TG_OP, rec.id, rec.user_id, rec.student_id, rec.disciplina_id,
    rec.turma_id, rec.data, rec.status, rec.justificativa,
    to_jsonb(rec)
  );

  RETURN rec;
END;
$$;

CREATE TRIGGER trg_backup_presenca
  AFTER INSERT OR UPDATE OR DELETE ON public.presencas
  FOR EACH ROW EXECUTE FUNCTION public.fn_backup_presenca();