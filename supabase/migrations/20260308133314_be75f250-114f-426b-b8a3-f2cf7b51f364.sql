
ALTER TABLE public.cad_professores
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS data_nascimento date,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS telefone2 text,
  ADD COLUMN IF NOT EXISTS formacao text,
  ADD COLUMN IF NOT EXISTS indicacao text,
  ADD COLUMN IF NOT EXISTS funcao text,
  ADD COLUMN IF NOT EXISTS experiencia text,
  ADD COLUMN IF NOT EXISTS coren text,
  ADD COLUMN IF NOT EXISTS disciplinas_lecionar text,
  ADD COLUMN IF NOT EXISTS turnos_disponiveis text;
