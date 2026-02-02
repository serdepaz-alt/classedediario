-- Corrigir segurança das views (usar security_invoker)
DROP VIEW IF EXISTS vw_analise_preditiva;
DROP VIEW IF EXISTS vw_hotspots_turmas;

-- VIEW com security_invoker (respeita RLS do usuário)
CREATE VIEW vw_analise_preditiva
WITH (security_invoker = true)
AS
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

CREATE VIEW vw_hotspots_turmas
WITH (security_invoker = true)
AS
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

-- Corrigir funções com search_path
CREATE OR REPLACE FUNCTION fn_calcular_valor_aula()
RETURNS TRIGGER AS $$
DECLARE
    v_valor_hora DECIMAL(10,2);
    v_horas DECIMAL(5,2);
BEGIN
    IF NEW.professor_id IS NOT NULL THEN
        SELECT valor_hora INTO v_valor_hora
        FROM public.cad_professores
        WHERE id = NEW.professor_id;
        
        v_horas := EXTRACT(EPOCH FROM (NEW.hora_fim - NEW.hora_inicio)) / 3600;
        NEW.valor_calculado := ROUND(COALESCE(v_valor_hora, 50) * v_horas, 2);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION fn_log_evento_preditivo()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status_aula IS DISTINCT FROM 'Cancelada' AND NEW.status_aula = 'Cancelada' THEN
        INSERT INTO public.logs_preditivos (user_id, aula_id, tipo_alteracao, custo_adicional)
        VALUES (NEW.user_id, NEW.id, 'Aula cancelada', 0);
        
        NEW.status_financeiro := 'Bloqueado';
    END IF;

    IF OLD.professor_id IS DISTINCT FROM NEW.professor_id AND OLD.professor_id IS NOT NULL THEN
        INSERT INTO public.logs_preditivos (user_id, aula_id, tipo_alteracao, custo_adicional)
        VALUES (NEW.user_id, NEW.id, 'Professor substituído', NEW.valor_calculado);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION fn_log_reagendamento()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.data_aula IS DISTINCT FROM NEW.data_aula 
       OR OLD.hora_inicio IS DISTINCT FROM NEW.hora_inicio THEN
        INSERT INTO public.logs_preditivos (user_id, aula_id, tipo_alteracao)
        VALUES (NEW.user_id, NEW.id, 'Aula reagendada');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;