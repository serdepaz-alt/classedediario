
ALTER TABLE public.backlog_anotacoes 
ADD COLUMN quadro text NOT NULL DEFAULT 'anotacoes';

-- Update existing items
UPDATE public.backlog_anotacoes SET quadro = 'anotacoes' WHERE quadro = 'anotacoes';
