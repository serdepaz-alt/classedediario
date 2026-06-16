ALTER TABLE public.conteudo_programatico_aulas
ADD COLUMN IF NOT EXISTS tier_carga TEXT CHECK (tier_carga IN ('3h','2h'));

CREATE INDEX IF NOT EXISTS idx_cpa_nome_tier
  ON public.conteudo_programatico_aulas (user_id, disciplina_nome, tier_carga);