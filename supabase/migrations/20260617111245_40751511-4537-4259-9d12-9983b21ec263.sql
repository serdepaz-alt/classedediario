
-- 1) cad_administradores: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can view administradores" ON public.cad_administradores;

CREATE POLICY "Admins can view administradores"
ON public.cad_administradores FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2) contratos_professores: revoke column-level access to sensitive token fields
REVOKE SELECT (token_aceite, aceito_ip) ON public.contratos_professores FROM authenticated;
REVOKE SELECT (token_aceite, aceito_ip) ON public.contratos_professores FROM anon;
