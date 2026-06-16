
-- 1) realtime.messages: require authenticated session
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can read realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated users can read realtime messages"
ON realtime.messages FOR SELECT TO authenticated USING (true);

-- 2) UPDATE policy for conteudo_programatico_docs
DROP POLICY IF EXISTS "Users can update their own conteudo_programatico_docs" ON public.conteudo_programatico_docs;
CREATE POLICY "Users can update their own conteudo_programatico_docs"
ON public.conteudo_programatico_docs FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3) DELETE policy for folha_fechamento
DROP POLICY IF EXISTS "Users can delete their own folha_fechamento" ON public.folha_fechamento;
CREATE POLICY "Users can delete their own folha_fechamento"
ON public.folha_fechamento FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 4) storage policies for 'lucianoribeiro' bucket
DROP POLICY IF EXISTS "lucianoribeiro owner can read" ON storage.objects;
DROP POLICY IF EXISTS "lucianoribeiro owner can insert" ON storage.objects;
DROP POLICY IF EXISTS "lucianoribeiro owner can update" ON storage.objects;
DROP POLICY IF EXISTS "lucianoribeiro owner can delete" ON storage.objects;
CREATE POLICY "lucianoribeiro owner can read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lucianoribeiro' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "lucianoribeiro owner can insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lucianoribeiro' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "lucianoribeiro owner can update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'lucianoribeiro' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'lucianoribeiro' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "lucianoribeiro owner can delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lucianoribeiro' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5) Lock down EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.fn_log_evento_preditivo() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_log_reagendamento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_professor_nome(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_for_professor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_professor_nome(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_for_professor(uuid) TO authenticated;

-- 6) pg_net out of public schema (DROP + recreate in extensions schema)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
