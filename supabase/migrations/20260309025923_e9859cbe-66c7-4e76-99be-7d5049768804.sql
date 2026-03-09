
-- Table to track backlog items per collaborator for each annotation
CREATE TABLE public.backlog_anotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  anotacao_id uuid NOT NULL REFERENCES public.anotacoes(id) ON DELETE CASCADE,
  responsavel_tipo text NOT NULL DEFAULT 'admin', -- 'professor' or 'admin'
  responsavel_nome text,
  professor_id uuid REFERENCES public.cad_professores(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'pendente', -- pendente, em_andamento, concluido
  prioridade text NOT NULL DEFAULT 'normal',
  lido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.backlog_anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backlog" ON public.backlog_anotacoes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backlog" ON public.backlog_anotacoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backlog" ON public.backlog_anotacoes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backlog" ON public.backlog_anotacoes
  FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.backlog_anotacoes;
