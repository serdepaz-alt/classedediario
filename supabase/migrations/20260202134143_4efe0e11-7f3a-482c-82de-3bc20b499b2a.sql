-- ===========================================
-- VIBE CODE: ESTRUTURA COMPLETA PREDITIVA
-- ===========================================

-- 1. TABELA: Cadastro de Professores
CREATE TABLE IF NOT EXISTS public.cad_professores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    valor_hora DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    especialidade TEXT,
    status TEXT DEFAULT 'Ativo',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA: Cadastro de Disciplinas (catálogo)
CREATE TABLE IF NOT EXISTS public.cad_disciplinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    nome TEXT NOT NULL,
    carga_horaria INTEGER DEFAULT 60,
    curso TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA: Cronograma Mestre (coração do sistema)
CREATE TABLE IF NOT EXISTS public.cronograma_mestre (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    turma_id UUID REFERENCES public.turmas(id) ON DELETE CASCADE,
    disciplina_id UUID REFERENCES public.cad_disciplinas(id) ON DELETE SET NULL,
    professor_id UUID REFERENCES public.cad_professores(id) ON DELETE SET NULL,
    data_aula DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    valor_calculado DECIMAL(10,2) DEFAULT 0,
    status_aula TEXT DEFAULT 'Agendada',
    status_financeiro TEXT DEFAULT 'Pendente',
    aceite_professor BOOLEAN DEFAULT FALSE,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA: Logs Preditivos (registro de eventos)
CREATE TABLE IF NOT EXISTS public.logs_preditivos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    aula_id UUID REFERENCES public.cronograma_mestre(id) ON DELETE CASCADE,
    tipo_alteracao TEXT NOT NULL,
    custo_adicional DECIMAL(10,2) DEFAULT 0,
    descricao TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. RLS para cad_professores
ALTER TABLE public.cad_professores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own professors"
ON public.cad_professores FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own professors"
ON public.cad_professores FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own professors"
ON public.cad_professores FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own professors"
ON public.cad_professores FOR DELETE
USING (auth.uid() = user_id);

-- 6. RLS para cad_disciplinas
ALTER TABLE public.cad_disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cad_disciplinas"
ON public.cad_disciplinas FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cad_disciplinas"
ON public.cad_disciplinas FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cad_disciplinas"
ON public.cad_disciplinas FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cad_disciplinas"
ON public.cad_disciplinas FOR DELETE
USING (auth.uid() = user_id);

-- 7. RLS para cronograma_mestre
ALTER TABLE public.cronograma_mestre ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cronograma"
ON public.cronograma_mestre FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cronograma"
ON public.cronograma_mestre FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cronograma"
ON public.cronograma_mestre FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cronograma"
ON public.cronograma_mestre FOR DELETE
USING (auth.uid() = user_id);

-- 8. RLS para logs_preditivos
ALTER TABLE public.logs_preditivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own logs"
ON public.logs_preditivos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create logs"
ON public.logs_preditivos FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 9. FUNÇÃO: Calcular valor da aula automaticamente
CREATE OR REPLACE FUNCTION fn_calcular_valor_aula()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_hora DECIMAL(10,2);
    v_horas DECIMAL(5,2);
BEGIN
    IF NEW.professor_id IS NOT NULL THEN
        SELECT valor_hora INTO v_valor_hora
        FROM cad_professores
        WHERE id = NEW.professor_id;
        
        v_horas := EXTRACT(EPOCH FROM (NEW.hora_fim - NEW.hora_inicio)) / 3600;
        NEW.valor_calculado := ROUND(COALESCE(v_valor_hora, 50) * v_horas, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. TRIGGER: Auto-cálculo de valor
CREATE TRIGGER tg_calcular_valor_aula
BEFORE INSERT OR UPDATE OF professor_id, hora_inicio, hora_fim
ON cronograma_mestre
FOR EACH ROW
EXECUTE FUNCTION fn_calcular_valor_aula();

-- 11. FUNÇÃO: Log de eventos preditivos
CREATE OR REPLACE FUNCTION fn_log_evento_preditivo()
RETURNS TRIGGER AS $$
BEGIN
    -- Cancelamento
    IF OLD.status_aula IS DISTINCT FROM 'Cancelada' AND NEW.status_aula = 'Cancelada' THEN
        INSERT INTO logs_preditivos (user_id, aula_id, tipo_alteracao, custo_adicional)
        VALUES (NEW.user_id, NEW.id, 'Aula cancelada', 0);
        
        NEW.status_financeiro := 'Bloqueado';
    END IF;

    -- Substituição de professor
    IF OLD.professor_id IS DISTINCT FROM NEW.professor_id AND OLD.professor_id IS NOT NULL THEN
        INSERT INTO logs_preditivos (user_id, aula_id, tipo_alteracao, custo_adicional)
        VALUES (NEW.user_id, NEW.id, 'Professor substituído', NEW.valor_calculado);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. TRIGGER: Log automático
CREATE TRIGGER tg_log_evento_preditivo
AFTER UPDATE OF status_aula, professor_id
ON cronograma_mestre
FOR EACH ROW
EXECUTE FUNCTION fn_log_evento_preditivo();

-- 13. FUNÇÃO: Log de reagendamento
CREATE OR REPLACE FUNCTION fn_log_reagendamento()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.data_aula IS DISTINCT FROM NEW.data_aula 
       OR OLD.hora_inicio IS DISTINCT FROM NEW.hora_inicio THEN
        INSERT INTO logs_preditivos (user_id, aula_id, tipo_alteracao)
        VALUES (NEW.user_id, NEW.id, 'Aula reagendada');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. TRIGGER: Reagendamento
CREATE TRIGGER tg_log_reagendamento
AFTER UPDATE OF data_aula, hora_inicio
ON cronograma_mestre
FOR EACH ROW
EXECUTE FUNCTION fn_log_reagendamento();

-- 15. VIEW: Análise Preditiva Principal
CREATE OR REPLACE VIEW vw_analise_preditiva AS
WITH base_aulas AS (
    SELECT
        cm.id AS aula_id,
        cm.user_id,
        cm.turma_id,
        cm.professor_id,
        cm.disciplina_id,
        DATE_TRUNC('month', cm.data_aula) AS mes_referencia,
        cm.valor_calculado,
        cm.status_aula
    FROM cronograma_mestre cm
    WHERE cm.data_aula >= CURRENT_DATE
),
volatilidade AS (
    SELECT
        cm.user_id,
        cm.turma_id,
        COUNT(lp.id) AS total_ocorrencias,
        COUNT(cm.id) AS total_aulas,
        ROUND(
            COUNT(lp.id)::decimal / NULLIF(COUNT(cm.id), 0),
            4
        ) AS indice_volatilidade
    FROM cronograma_mestre cm
    LEFT JOIN logs_preditivos lp ON lp.aula_id = cm.id
    GROUP BY cm.user_id, cm.turma_id
),
financeiro AS (
    SELECT
        b.user_id,
        b.mes_referencia,
        b.turma_id,
        SUM(b.valor_calculado) AS custo_planejado
    FROM base_aulas b
    GROUP BY b.user_id, b.mes_referencia, b.turma_id
)
SELECT
    f.user_id,
    f.mes_referencia,
    f.turma_id,
    f.custo_planejado,
    COALESCE(v.indice_volatilidade, 0) AS indice_volatilidade,
    CASE
        WHEN COALESCE(v.indice_volatilidade, 0) > 0.10 THEN 'CRÍTICO'
        WHEN COALESCE(v.indice_volatilidade, 0) BETWEEN 0.05 AND 0.10 THEN 'ATENÇÃO'
        ELSE 'ESTÁVEL'
    END AS status_risco,
    CASE
        WHEN COALESCE(v.indice_volatilidade, 0) > 0.10 THEN 1.15
        ELSE 1.00
    END AS fator_risco,
    ROUND(
        f.custo_planejado *
        CASE
            WHEN COALESCE(v.indice_volatilidade, 0) > 0.10 THEN 1.15
            ELSE 1.00
        END,
        2
    ) AS custo_com_risco
FROM financeiro f
LEFT JOIN volatilidade v ON v.turma_id = f.turma_id AND v.user_id = f.user_id;

-- 16. VIEW: Hotspots de Turmas
CREATE OR REPLACE VIEW vw_hotspots_turmas AS
WITH aulas_por_turma AS (
    SELECT
        cm.user_id,
        cm.turma_id,
        cm.disciplina_id,
        cm.professor_id,
        COUNT(cm.id) AS total_aulas,
        SUM(cm.valor_calculado) AS custo_planejado
    FROM cronograma_mestre cm
    GROUP BY cm.user_id, cm.turma_id, cm.disciplina_id, cm.professor_id
),
substituicoes AS (
    SELECT
        cm.turma_id,
        COUNT(lp.id) AS total_substituicoes
    FROM cronograma_mestre cm
    JOIN logs_preditivos lp ON lp.aula_id = cm.id AND lp.tipo_alteracao = 'Professor substituído'
    GROUP BY cm.turma_id
)
SELECT
    a.user_id,
    t.id AS turma_id,
    t.nome AS turma,
    COALESCE(d.nome, 'Não definida') AS disciplina,
    COALESCE(p.nome, 'Não definido') AS professor_titular,
    a.total_aulas,
    COALESCE(s.total_substituicoes, 0) AS total_substituicoes,
    ROUND(
        COALESCE(s.total_substituicoes, 0)::decimal / NULLIF(a.total_aulas, 0),
        4
    ) AS percentual_substituicoes,
    a.custo_planejado,
    ROUND(
        a.custo_planejado *
        CASE
            WHEN COALESCE(s.total_substituicoes, 0)::decimal / NULLIF(a.total_aulas, 0) > 0.10 THEN 0.15
            WHEN COALESCE(s.total_substituicoes, 0)::decimal / NULLIF(a.total_aulas, 0) BETWEEN 0.05 AND 0.10 THEN 0.07
            ELSE 0.00
        END,
        2
    ) AS impacto_financeiro_estimado,
    CASE
        WHEN COALESCE(s.total_substituicoes, 0)::decimal / NULLIF(a.total_aulas, 0) > 0.10 THEN 'CRÍTICO'
        WHEN COALESCE(s.total_substituicoes, 0)::decimal / NULLIF(a.total_aulas, 0) BETWEEN 0.05 AND 0.10 THEN 'ATENÇÃO'
        ELSE 'ESTÁVEL'
    END AS status_risco
FROM aulas_por_turma a
LEFT JOIN substituicoes s ON s.turma_id = a.turma_id
JOIN turmas t ON t.id = a.turma_id
LEFT JOIN cad_disciplinas d ON d.id = a.disciplina_id
LEFT JOIN cad_professores p ON p.id = a.professor_id;