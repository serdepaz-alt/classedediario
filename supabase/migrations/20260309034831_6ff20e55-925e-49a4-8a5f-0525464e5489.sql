
CREATE TABLE public.conteudo_programatico_aulas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  disciplina_id UUID REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  disciplina_nome TEXT NOT NULL,
  data_aula DATE NOT NULL,
  topico TEXT NOT NULL,
  objetivo TEXT,
  metodologia TEXT,
  recursos TEXT,
  tipo_avaliacao TEXT NOT NULL DEFAULT 'aula',
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'planejado',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conteudo_programatico_aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own aulas programaticas"
  ON public.conteudo_programatico_aulas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own aulas programaticas"
  ON public.conteudo_programatico_aulas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own aulas programaticas"
  ON public.conteudo_programatico_aulas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aulas programaticas"
  ON public.conteudo_programatico_aulas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
