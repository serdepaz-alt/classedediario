
-- 1) Restrict students visibility for professors: only students in turmas where the professor has an assigned discipline
DROP POLICY IF EXISTS "Professores veem alunos do admin" ON public.students;

CREATE POLICY "Professores veem alunos das suas turmas"
ON public.students
FOR SELECT
TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND turma_id IN (
    SELECT d.turma_id
    FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND d.nome_professor = public.get_professor_nome(auth.uid())
      AND d.turma_id IS NOT NULL
  )
);

-- 2) Remove professor self-view policy on cad_professores so professors cannot SELECT their own row
--    (and therefore cannot read senha/cpf/rg). Admin-side SELECT (auth.uid() = user_id) remains.
DROP POLICY IF EXISTS "Professor ve seu proprio cadastro" ON public.cad_professores;

-- 3) Column-level protection: revoke SELECT on the senha column from the authenticated role.
--    Only the service_role (used by trusted edge functions) can read it.
REVOKE SELECT (senha) ON public.cad_professores FROM authenticated;
REVOKE SELECT (senha) ON public.cad_professores FROM anon;
