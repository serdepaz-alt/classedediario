
CREATE TABLE public.anotacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  conteudo TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'info',
  prioridade TEXT NOT NULL DEFAULT 'normal',
  disciplina TEXT,
  status_acompanhamento TEXT NOT NULL DEFAULT 'pendente',
  observacao_admin TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own anotacoes" ON public.anotacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own anotacoes" ON public.anotacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own anotacoes" ON public.anotacoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own anotacoes" ON public.anotacoes FOR DELETE USING (auth.uid() = user_id);
