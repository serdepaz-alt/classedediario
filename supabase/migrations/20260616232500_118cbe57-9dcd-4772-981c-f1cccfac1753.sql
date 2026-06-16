WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, disciplina_nome, COALESCE(tier_carga,''), data_aula, topico
           ORDER BY created_at NULLS LAST, id
         ) AS rn
  FROM public.conteudo_programatico_aulas
)
DELETE FROM public.conteudo_programatico_aulas a
USING ranked r
WHERE a.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS conteudo_aulas_unique_template
ON public.conteudo_programatico_aulas (user_id, disciplina_nome, COALESCE(tier_carga,''), data_aula, topico);