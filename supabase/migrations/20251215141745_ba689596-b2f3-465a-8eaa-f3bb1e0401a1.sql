-- Add timestamp columns to presencas table for tracking class start and save times
ALTER TABLE public.presencas
ADD COLUMN IF NOT EXISTS horario_inicio TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS horario_salvamento TIMESTAMP WITH TIME ZONE;

-- Add column to track accumulated absences/lates for notification purposes
ALTER TABLE public.presencas
ADD COLUMN IF NOT EXISTS notificacao_enviada BOOLEAN DEFAULT FALSE;