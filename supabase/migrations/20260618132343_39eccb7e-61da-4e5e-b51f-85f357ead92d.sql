-- 1. Remove CASCADE → use RESTRICT so dependent rows can't be deleted when chamadas exist
ALTER TABLE public.presencas DROP CONSTRAINT IF EXISTS presencas_disciplina_id_fkey;
ALTER TABLE public.presencas
  ADD CONSTRAINT presencas_disciplina_id_fkey
  FOREIGN KEY (disciplina_id) REFERENCES public.disciplinas(id) ON DELETE RESTRICT;

ALTER TABLE public.presencas DROP CONSTRAINT IF EXISTS presencas_student_id_fkey;
ALTER TABLE public.presencas
  ADD CONSTRAINT presencas_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE RESTRICT;

-- 2. Revoke DELETE privilege from app role
REVOKE DELETE ON public.presencas FROM authenticated, anon;

-- 3. Drop any existing DELETE policies on presencas
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='presencas' AND cmd='DELETE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.presencas', r.policyname);
  END LOOP;
END $$;

-- 4. Hard block at trigger level (defense in depth — also blocks service_role)
CREATE OR REPLACE FUNCTION public.fn_block_presenca_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Exclusão de chamadas não é permitida. Registros de presença são imutáveis para auditoria.';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_block_presenca_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_block_presenca_delete ON public.presencas;
CREATE TRIGGER trg_block_presenca_delete
  BEFORE DELETE ON public.presencas
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_presenca_delete();

-- 5. Add turno + turma_nome + disciplina_nome to backup for easy filtering
ALTER TABLE public.presencas_backup
  ADD COLUMN IF NOT EXISTS turno text,
  ADD COLUMN IF NOT EXISTS turma_nome text,
  ADD COLUMN IF NOT EXISTS disciplina_nome text;

CREATE INDEX IF NOT EXISTS idx_presencas_backup_turno
  ON public.presencas_backup(user_id, disciplina_id, turno, data);

-- 6. Update backup trigger to populate turno/turma_nome/disciplina_nome
CREATE OR REPLACE FUNCTION public.fn_backup_presenca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec record;
  v_turno text;
  v_turma_nome text;
  v_disciplina_nome text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  SELECT t.turno, t.nome INTO v_turno, v_turma_nome
  FROM public.turmas t WHERE t.id = rec.turma_id;

  SELECT d.nome INTO v_disciplina_nome
  FROM public.disciplinas d WHERE d.id = rec.disciplina_id;

  INSERT INTO public.presencas_backup(
    operacao, presenca_id, user_id, student_id, disciplina_id,
    turma_id, data, status, justificativa, snapshot,
    turno, turma_nome, disciplina_nome
  ) VALUES (
    TG_OP, rec.id, rec.user_id, rec.student_id, rec.disciplina_id,
    rec.turma_id, rec.data, rec.status, rec.justificativa,
    to_jsonb(rec),
    v_turno, v_turma_nome, v_disciplina_nome
  );

  RETURN rec;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_backup_presenca() FROM PUBLIC, anon, authenticated;