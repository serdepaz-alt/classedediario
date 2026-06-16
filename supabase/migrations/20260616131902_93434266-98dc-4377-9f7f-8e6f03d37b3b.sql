-- Make professor name matching case/whitespace-insensitive across all professor policies

-- students
DROP POLICY IF EXISTS "Professores veem alunos das suas turmas" ON public.students;
CREATE POLICY "Professores veem alunos das suas turmas" ON public.students
FOR SELECT TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND turma_id IN (
    SELECT d.turma_id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
      AND d.turma_id IS NOT NULL
  )
);

-- disciplinas
DROP POLICY IF EXISTS "Professores veem suas disciplinas" ON public.disciplinas;
CREATE POLICY "Professores veem suas disciplinas" ON public.disciplinas
FOR SELECT TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND lower(trim(nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
);

-- presencas
DROP POLICY IF EXISTS "Professores veem presencas de suas disciplinas" ON public.presencas;
CREATE POLICY "Professores veem presencas de suas disciplinas" ON public.presencas
FOR SELECT TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND disciplina_id IN (
    SELECT d.id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Professores atualizam presencas de suas disciplinas" ON public.presencas;
CREATE POLICY "Professores atualizam presencas de suas disciplinas" ON public.presencas
FOR UPDATE TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND disciplina_id IN (
    SELECT d.id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);

-- notas
DROP POLICY IF EXISTS "Professores veem notas de suas disciplinas" ON public.notas;
CREATE POLICY "Professores veem notas de suas disciplinas" ON public.notas
FOR SELECT TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND disciplina_id IN (
    SELECT d.id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Professores atualizam notas de suas disciplinas" ON public.notas;
CREATE POLICY "Professores atualizam notas de suas disciplinas" ON public.notas
FOR UPDATE TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND disciplina_id IN (
    SELECT d.id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);

-- medias_alunos
DROP POLICY IF EXISTS "Professores veem medias de suas disciplinas" ON public.medias_alunos;
CREATE POLICY "Professores veem medias de suas disciplinas" ON public.medias_alunos
FOR SELECT TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND disciplina_id IN (
    SELECT d.id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);

DROP POLICY IF EXISTS "Professores atualizam medias de suas disciplinas" ON public.medias_alunos;
CREATE POLICY "Professores atualizam medias de suas disciplinas" ON public.medias_alunos
FOR UPDATE TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND disciplina_id IN (
    SELECT d.id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);

-- conteudo_programatico_aulas
DROP POLICY IF EXISTS "Professores veem aulas programaticas" ON public.conteudo_programatico_aulas;
CREATE POLICY "Professores veem aulas programaticas" ON public.conteudo_programatico_aulas
FOR SELECT TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND disciplina_id IN (
    SELECT d.id FROM public.disciplinas d
    WHERE d.user_id = public.get_admin_for_professor(auth.uid())
      AND lower(trim(d.nome_professor)) = lower(trim(public.get_professor_nome(auth.uid())))
  )
);