-- Garantir que a UNIQUE (disciplina_id, student_id, data) existe para suportar ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'presencas_disciplina_id_student_id_data_key'
      AND conrelid = 'public.presencas'::regclass
  ) THEN
    ALTER TABLE public.presencas
      ADD CONSTRAINT presencas_disciplina_id_student_id_data_key
      UNIQUE (disciplina_id, student_id, data);
  END IF;
END$$;

-- Índice de apoio para a query de leitura por (user, disciplina, data)
CREATE INDEX IF NOT EXISTS idx_presencas_user_disc_data
  ON public.presencas(user_id, disciplina_id, data);