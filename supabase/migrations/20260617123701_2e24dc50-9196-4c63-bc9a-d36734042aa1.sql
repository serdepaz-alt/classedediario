CREATE POLICY "Users can view own admin record by email"
ON public.cad_administradores
FOR SELECT
TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')));

CREATE POLICY "Users can view own professor record by email"
ON public.cad_professores
FOR SELECT
TO authenticated
USING (lower(email) = lower((auth.jwt() ->> 'email')));