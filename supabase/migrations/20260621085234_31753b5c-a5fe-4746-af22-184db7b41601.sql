CREATE OR REPLACE FUNCTION public.fn_backup_presenca()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec record;
  v_turno text;
  v_turma_id uuid;
  v_turma_nome text;
  v_disciplina_nome text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  -- presencas não possui turma_id nem turno; ambos vêm de disciplinas (e turmas via FK)
  SELECT d.turno, d.turma_id, d.nome
    INTO v_turno, v_turma_id, v_disciplina_nome
  FROM public.disciplinas d
  WHERE d.id = rec.disciplina_id;

  IF v_turma_id IS NOT NULL THEN
    SELECT t.nome INTO v_turma_nome
    FROM public.turmas t
    WHERE t.id = v_turma_id;
  END IF;

  INSERT INTO public.presencas_backup(
    operacao, presenca_id, user_id, student_id, disciplina_id,
    turma_id, data, status, justificativa, snapshot,
    turno, turma_nome, disciplina_nome
  ) VALUES (
    TG_OP, rec.id, rec.user_id, rec.student_id, rec.disciplina_id,
    v_turma_id, rec.data, rec.status, rec.justificativa,
    to_jsonb(rec),
    v_turno, v_turma_nome, v_disciplina_nome
  );

  RETURN rec;
END;
$function$;