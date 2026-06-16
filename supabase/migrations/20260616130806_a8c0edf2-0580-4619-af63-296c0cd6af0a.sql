DROP POLICY IF EXISTS "Professores veem turmas do admin" ON public.turmas;

CREATE POLICY "Professores veem suas turmas escaladas"
ON public.turmas
FOR SELECT
TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND id IN (
    SELECT d.turma_id
    FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND d.nome_professor = public.get_professor_nome(auth.uid())
      AND d.turma_id IS NOT NULL
  )
);