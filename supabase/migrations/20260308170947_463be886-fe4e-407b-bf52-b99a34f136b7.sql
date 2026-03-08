
CREATE TABLE public.medias_alunos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  disciplina_id uuid NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  media_parcial numeric DEFAULT 0,
  media_final numeric DEFAULT 0,
  bonus numeric DEFAULT 0,
  situacao text DEFAULT 'Em Andamento',
  total_avaliacoes integer DEFAULT 0,
  avaliacoes_travadas integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(student_id, disciplina_id)
);

ALTER TABLE public.medias_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own medias" ON public.medias_alunos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own medias" ON public.medias_alunos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own medias" ON public.medias_alunos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own medias" ON public.medias_alunos FOR DELETE USING (auth.uid() = user_id);
