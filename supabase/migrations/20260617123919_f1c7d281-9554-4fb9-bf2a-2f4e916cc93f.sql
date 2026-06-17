-- 1) Revoke sensitive column reads from authenticated on contratos_professores
REVOKE SELECT (token_aceite, aceito_ip) ON public.contratos_professores FROM authenticated;
REVOKE SELECT (token_aceite, aceito_ip) ON public.contratos_professores FROM anon;

-- 2) Allow professors to read their own backlog items (Realtime-compatible)
CREATE POLICY "Professores veem seus itens do backlog"
ON public.backlog_anotacoes
FOR SELECT
TO authenticated
USING (
  professor_id IN (
    SELECT pl.professor_id
    FROM public.professor_logins pl
    WHERE pl.auth_user_id = auth.uid()
  )
);