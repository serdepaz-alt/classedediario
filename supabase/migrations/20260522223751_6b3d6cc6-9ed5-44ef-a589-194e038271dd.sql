UPDATE public.cad_professores
SET senha = lower(split_part(trim(nome), ' ', 1)) || EXTRACT(YEAR FROM data_nascimento)::text
WHERE data_nascimento IS NOT NULL
  AND nome IS NOT NULL
  AND email NOT IN ('serdepaz@gmail.com', 'luciano.ribeiro@irmadulceoficial.com.br');