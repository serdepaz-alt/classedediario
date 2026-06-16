
UPDATE public.conteudo_programatico_aulas
SET disciplina_nome = 'Microbiologia e Parasitologia',
    disciplina_id = NULL
WHERE disciplina_nome = 'Farmacologia'
  AND (
    topico ILIKE '%Biologia Celular%'
    OR topico ILIKE '%Terminologia Aplicada%'
    OR topico ILIKE '%Visualização e Medidas%'
    OR topico ILIKE '%Morfologia Bacteriana%'
    OR topico ILIKE '%Coloração de Gram%'
    OR topico ILIKE '%Infecção Hospitalar%'
    OR topico ILIKE '%Vias de Transmissão%'
    OR topico ILIKE '%Cuidados com Dispositivos Invasivos%'
    OR topico ILIKE '%Imunologia%'
    OR topico ILIKE '%Antibióticos e Resistência%'
    OR topico ILIKE '%Bacterioses%'
    OR topico ILIKE '%Histórico da Farmacologia%'
  );
