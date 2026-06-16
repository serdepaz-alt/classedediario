
-- 1. Tighten realtime.messages SELECT policy to scope by user-prefixed topic
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
CREATE POLICY "Users can read their own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE (auth.uid()::text || ':%')
);

-- 2. Column-level: hide sensitive contract fields from authenticated role
-- Edge functions (service_role) and the public token-acceptance flow (anon via SECURITY DEFINER RPCs) are unaffected.
REVOKE SELECT (token_aceite, aceito_ip) ON public.contratos_professores FROM authenticated;
