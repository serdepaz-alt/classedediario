
-- Tabela oficial de valores por turno/categoria
CREATE TABLE public.tabela_valores_hora (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Técnico',
  turno TEXT NOT NULL DEFAULT 'Diurno',
  valor_hora NUMERIC(10,2) NOT NULL DEFAULT 50.00,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tabela_valores_hora ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own valores" ON public.tabela_valores_hora FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own valores" ON public.tabela_valores_hora FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own valores" ON public.tabela_valores_hora FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own valores" ON public.tabela_valores_hora FOR DELETE USING (auth.uid() = user_id);

-- Tabela de valores de estágio
CREATE TABLE public.valores_estagio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  unidade_hospitalar TEXT NOT NULL,
  valor_base NUMERIC(10,2) NOT NULL DEFAULT 0,
  dias_padrao INTEGER NOT NULL DEFAULT 1,
  valor_vt NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_va NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_total_calculado NUMERIC(10,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.valores_estagio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own estagios" ON public.valores_estagio FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own estagios" ON public.valores_estagio FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own estagios" ON public.valores_estagio FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own estagios" ON public.valores_estagio FOR DELETE USING (auth.uid() = user_id);

-- Audit trail imutável (somente insert + select)
CREATE TABLE public.audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  usuario_responsavel TEXT NOT NULL,
  acao TEXT NOT NULL,
  tabela_afetada TEXT NOT NULL,
  registro_id UUID,
  valor_anterior JSONB,
  valor_novo JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own audit" ON public.audit_trail FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create audit entries" ON public.audit_trail FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fechamento de folha
CREATE TABLE public.folha_fechamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mes_referencia DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  fechada_por TEXT,
  fechada_em TIMESTAMPTZ,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.folha_fechamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own folha" ON public.folha_fechamento FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own folha" ON public.folha_fechamento FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own folha" ON public.folha_fechamento FOR UPDATE USING (auth.uid() = user_id);

-- Contestações de professores
CREATE TABLE public.contestacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  professor_id UUID REFERENCES public.cad_professores(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL,
  descricao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  resposta TEXT,
  respondido_por TEXT,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contestacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contestacoes" ON public.contestacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contestacoes" ON public.contestacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contestacoes" ON public.contestacoes FOR UPDATE USING (auth.uid() = user_id);
