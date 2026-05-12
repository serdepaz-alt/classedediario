-- 1. Enum de papéis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'professor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. professor_logins: liga conta auth → cad_professores → admin
CREATE TABLE IF NOT EXISTS public.professor_logins (
  auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  professor_id uuid NOT NULL,
  admin_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.professor_logins ENABLE ROW LEVEL SECURITY;

-- 4. Funções seguras
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_admin_for_professor(_auth_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT admin_user_id FROM public.professor_logins WHERE auth_user_id = _auth_user_id LIMIT 1 $$;

CREATE OR REPLACE FUNCTION public.get_professor_nome(_auth_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.nome
  FROM public.professor_logins pl
  JOIN public.cad_professores p ON p.id = pl.professor_id
  WHERE pl.auth_user_id = _auth_user_id
  LIMIT 1
$$;

-- 5. RLS para as tabelas auxiliares
CREATE POLICY "Users see own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own login link" ON public.professor_logins FOR SELECT
  USING (auth.uid() = auth_user_id OR auth.uid() = admin_user_id);
CREATE POLICY "Admin manages login links" ON public.professor_logins FOR ALL
  USING (auth.uid() = admin_user_id) WITH CHECK (auth.uid() = admin_user_id);

-- 6. Políticas adicionais para professores (SELECT em dados do admin)
-- DISCIPLINAS: professor vê só as disciplinas onde nome_professor = seu nome
CREATE POLICY "Professores veem suas disciplinas" ON public.disciplinas FOR SELECT
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND nome_professor = public.get_professor_nome(auth.uid())
  );

-- TURMAS: vê todas turmas do admin
CREATE POLICY "Professores veem turmas do admin" ON public.turmas FOR SELECT
  USING (user_id = public.get_admin_for_professor(auth.uid()));

-- STUDENTS: vê todos alunos do admin
CREATE POLICY "Professores veem alunos do admin" ON public.students FOR SELECT
  USING (user_id = public.get_admin_for_professor(auth.uid()));

-- PRESENCAS: vê e gerencia somente das suas disciplinas
CREATE POLICY "Professores veem presencas de suas disciplinas" ON public.presencas FOR SELECT
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );
CREATE POLICY "Professores criam presencas de suas disciplinas" ON public.presencas FOR INSERT
  WITH CHECK (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );
CREATE POLICY "Professores atualizam presencas de suas disciplinas" ON public.presencas FOR UPDATE
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );

-- NOTAS: idem
CREATE POLICY "Professores veem notas de suas disciplinas" ON public.notas FOR SELECT
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );
CREATE POLICY "Professores criam notas de suas disciplinas" ON public.notas FOR INSERT
  WITH CHECK (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );
CREATE POLICY "Professores atualizam notas de suas disciplinas" ON public.notas FOR UPDATE
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );

-- MEDIAS_ALUNOS
CREATE POLICY "Professores veem medias de suas disciplinas" ON public.medias_alunos FOR SELECT
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );
CREATE POLICY "Professores upsert medias de suas disciplinas" ON public.medias_alunos FOR INSERT
  WITH CHECK (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );
CREATE POLICY "Professores atualizam medias de suas disciplinas" ON public.medias_alunos FOR UPDATE
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    )
  );

-- FERIADOS: leitura
CREATE POLICY "Professores veem feriados do admin" ON public.feriados FOR SELECT
  USING (user_id = public.get_admin_for_professor(auth.uid()));

-- CONTEUDO_PROGRAMATICO_AULAS: leitura das suas disciplinas
CREATE POLICY "Professores veem aulas programaticas" ON public.conteudo_programatico_aulas FOR SELECT
  TO authenticated
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND (disciplina_id IS NULL OR disciplina_id IN (
      SELECT id FROM public.disciplinas
      WHERE user_id = public.get_admin_for_professor(auth.uid())
        AND nome_professor = public.get_professor_nome(auth.uid())
    ))
  );

-- CAD_PROFESSORES: professor vê seu próprio cadastro
CREATE POLICY "Professor ve seu proprio cadastro" ON public.cad_professores FOR SELECT
  USING (
    user_id = public.get_admin_for_professor(auth.uid())
    AND id IN (SELECT professor_id FROM public.professor_logins WHERE auth_user_id = auth.uid())
  );