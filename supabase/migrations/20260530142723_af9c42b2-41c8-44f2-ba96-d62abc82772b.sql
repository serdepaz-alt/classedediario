
-- 1. Add new columns to cad_professores
ALTER TABLE public.cad_professores
  ADD COLUMN IF NOT EXISTS estado_civil text,
  ADD COLUMN IF NOT EXISTS profissao text,
  ADD COLUMN IF NOT EXISTS endereco_rua text,
  ADD COLUMN IF NOT EXISTS endereco_numero text,
  ADD COLUMN IF NOT EXISTS endereco_bairro text,
  ADD COLUMN IF NOT EXISTS endereco_cep text;

-- 2. Create contratos_professores table
CREATE TABLE public.contratos_professores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  professor_id uuid NOT NULL,
  disciplina_id uuid,
  turma_id uuid,
  disciplina_nome text NOT NULL,
  carga_horaria integer NOT NULL DEFAULT 0,
  periodo_aulas text,
  valor_numerico numeric(10,2) NOT NULL DEFAULT 0,
  valor_extenso text,
  pdf_storage_path text,
  token_aceite uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status text NOT NULL DEFAULT 'enviado',
  email_destino text,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  aceito_em timestamptz,
  aceito_ip text,
  recusado_em timestamptz,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos_professores TO authenticated;
GRANT ALL ON public.contratos_professores TO service_role;

ALTER TABLE public.contratos_professores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contratos"
  ON public.contratos_professores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own contratos"
  ON public.contratos_professores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contratos"
  ON public.contratos_professores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own contratos"
  ON public.contratos_professores FOR DELETE
  USING (auth.uid() = user_id);

-- Professors can see their own contracts (linked via professor_logins)
CREATE POLICY "Professores veem seus contratos"
  ON public.contratos_professores FOR SELECT
  USING (
    user_id = get_admin_for_professor(auth.uid())
    AND professor_id IN (
      SELECT professor_id FROM public.professor_logins WHERE auth_user_id = auth.uid()
    )
  );

CREATE INDEX idx_contratos_user ON public.contratos_professores(user_id);
CREATE INDEX idx_contratos_professor ON public.contratos_professores(professor_id);
CREATE INDEX idx_contratos_token ON public.contratos_professores(token_aceite);

CREATE TRIGGER update_contratos_professores_updated_at
  BEFORE UPDATE ON public.contratos_professores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Create private storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('contratos', 'contratos', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for contratos bucket (user_id is first folder)
CREATE POLICY "Users can read their own contract PDFs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contratos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own contract PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contratos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own contract PDFs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'contratos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own contract PDFs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contratos' AND auth.uid()::text = (storage.foldername(name))[1]);
