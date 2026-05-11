DELETE FROM public.disciplinas
WHERE id IN (
  SELECT id FROM public.disciplinas
  WHERE turma_id = '9aa0e634-98a5-4c71-ba7b-33bc239eeb23'
  ORDER BY data_inicio ASC, created_at ASC
  OFFSET 28
);