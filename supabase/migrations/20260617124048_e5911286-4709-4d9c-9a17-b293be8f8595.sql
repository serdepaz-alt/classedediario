-- 1) Replace professor SELECT policy on contratos_professores with a safe RPC
DROP POLICY IF EXISTS "Professores veem seus contratos" ON public.contratos_professores;

CREATE OR REPLACE FUNCTION public.get_meus_contratos_professor()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  professor_id uuid,
  disciplina_id uuid,
  turma_id uuid,
  disciplina_nome text,
  carga_horaria numeric,
  periodo_aulas text,
  valor_numerico numeric,
  valor_extenso text,
  pdf_storage_path text,
  status text,
  email_destino text,
  enviado_em timestamptz,
  aceito_em timestamptz,
  recusado_em timestamptz,
  observacoes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.user_id, c.professor_id, c.disciplina_id, c.turma_id,
         c.disciplina_nome, c.carga_horaria, c.periodo_aulas,
         c.valor_numerico, c.valor_extenso, c.pdf_storage_path,
         c.status, c.email_destino, c.enviado_em, c.aceito_em,
         c.recusado_em, c.observacoes, c.created_at, c.updated_at
  FROM public.contratos_professores c
  WHERE c.user_id = public.get_admin_for_professor(auth.uid())
    AND c.professor_id IN (
      SELECT pl.professor_id FROM public.professor_logins pl
      WHERE pl.auth_user_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.get_meus_contratos_professor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_meus_contratos_professor() TO authenticated;

-- 2) Tighten backlog professor SELECT policy to scope by admin user_id + professor_id
DROP POLICY IF EXISTS "Professores veem seus itens do backlog" ON public.backlog_anotacoes;

CREATE POLICY "Professores veem seus itens do backlog"
ON public.backlog_anotacoes
FOR SELECT
TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND professor_id IN (
    SELECT pl.professor_id FROM public.professor_logins pl
    WHERE pl.auth_user_id = auth.uid()
  )
);

-- 3) Allow professors to read their own contestacoes
CREATE POLICY "Professores veem suas contestacoes"
ON public.contestacoes
FOR SELECT
TO authenticated
USING (
  user_id = public.get_admin_for_professor(auth.uid())
  AND professor_id IN (
    SELECT pl.professor_id FROM public.professor_logins pl
    WHERE pl.auth_user_id = auth.uid()
  )
);