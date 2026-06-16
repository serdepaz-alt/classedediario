DROP POLICY IF EXISTS "Professores veem suas turmas escaladas" ON public.turmas;

CREATE POLICY "Professores veem suas turmas escaladas"
ON public.turmas
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND d.turma_id = turmas.id
      AND d.nome_professor IS NOT NULL
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);