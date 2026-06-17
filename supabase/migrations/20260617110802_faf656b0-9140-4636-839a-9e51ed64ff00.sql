ALTER TABLE public.cad_administradores
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS cpf TEXT;