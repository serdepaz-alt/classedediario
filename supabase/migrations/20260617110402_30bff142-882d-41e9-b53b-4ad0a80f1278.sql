
CREATE TABLE public.cad_administradores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefone TEXT,
  funcao TEXT DEFAULT 'Administrador',
  status TEXT NOT NULL DEFAULT 'Ativo',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cad_administradores TO authenticated;
GRANT ALL ON public.cad_administradores TO service_role;

ALTER TABLE public.cad_administradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage administradores"
ON public.cad_administradores FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view administradores"
ON public.cad_administradores FOR SELECT TO authenticated
USING (true);

CREATE TRIGGER trg_cad_administradores_updated_at
BEFORE UPDATE ON public.cad_administradores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cad_administradores (user_id, nome, email, funcao, status)
VALUES
  ('2bf8e190-034f-4bdf-abbe-c6b685261143', 'Ser de Paz', 'serdepaz@gmail.com', 'Administrador Geral', 'Ativo'),
  ('b962fd8e-5874-4aec-af82-0c830165d528', 'Avaliações Dulce', 'avaliacoesdulce@gmail.com', 'Administrador', 'Ativo')
ON CONFLICT (email) DO NOTHING;
