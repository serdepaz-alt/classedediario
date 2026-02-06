-- Tabela para armazenar padrões de marcação de disciplinas
CREATE TABLE public.padroes_disciplinas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  turno text NOT NULL CHECK (turno IN ('Matutino', 'Noturno', 'Intermediário')),
  nome text NOT NULL,
  carga_horaria_total integer NOT NULL DEFAULT 60,
  carga_horaria_diaria integer NOT NULL DEFAULT 2,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.padroes_disciplinas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own padroes" 
ON public.padroes_disciplinas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own padroes" 
ON public.padroes_disciplinas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own padroes" 
ON public.padroes_disciplinas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own padroes" 
ON public.padroes_disciplinas FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_padroes_disciplinas_updated_at
BEFORE UPDATE ON public.padroes_disciplinas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para armazenar documentos do conteúdo programático
CREATE TABLE public.conteudo_programatico_docs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  disciplina_id uuid REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  turma_id uuid REFERENCES public.turmas(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  tipo_arquivo text NOT NULL,
  tamanho_bytes integer,
  storage_path text NOT NULL,
  descricao text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conteudo_programatico_docs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own docs" 
ON public.conteudo_programatico_docs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own docs" 
ON public.conteudo_programatico_docs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own docs" 
ON public.conteudo_programatico_docs FOR DELETE 
USING (auth.uid() = user_id);

-- Tabela para configuração de períodos letivos (para geração de cronogramas)
CREATE TABLE public.periodos_letivos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  ano_letivo integer NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.periodos_letivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own periodos" 
ON public.periodos_letivos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own periodos" 
ON public.periodos_letivos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own periodos" 
ON public.periodos_letivos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own periodos" 
ON public.periodos_letivos FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_periodos_letivos_updated_at
BEFORE UPDATE ON public.periodos_letivos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();