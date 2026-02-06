-- Criar bucket para documentos do conteúdo programático
INSERT INTO storage.buckets (id, name, public) VALUES ('conteudo-programatico', 'conteudo-programatico', false);

-- Policies para o bucket
CREATE POLICY "Users can view their own files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'conteudo-programatico' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'conteudo-programatico' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'conteudo-programatico' AND auth.uid()::text = (storage.foldername(name))[1]);