import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface PredictiveAnalysis {
  user_id: string;
  mes_referencia: string;
  turma_id: string;
  custo_planejado: number;
  indice_volatilidade: number;
  status_risco: "CRÍTICO" | "ATENÇÃO" | "ESTÁVEL";
  fator_risco: number;
  custo_com_risco: number;
}

export interface HotspotTurma {
  user_id: string;
  turma_id: string;
  turma: string;
  disciplina: string;
  professor_titular: string;
  total_aulas: number;
  total_substituicoes: number;
  percentual_substituicoes: number;
  custo_planejado: number;
  impacto_financeiro_estimado: number;
  status_risco: "CRÍTICO" | "ATENÇÃO" | "ESTÁVEL";
}

export interface PredictiveStats {
  custoProjeto: number;
  custoComRisco: number;
  indiceVolatilidadeMedia: number;
  turmasCriticas: number;
  aulasPendentesAceite: number;
  horasNoLimite: number;
}

const DSR_RATE = 0.1667;
const RISCO_CRITICO_MULT = 1.15; // +15% se volatilidade > 10%
const RISCO_ATENCAO_MULT = 1.07; // +7% se volatilidade 5-10%

function toMesKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toMesLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function parseHours(horaInicio: string | null | undefined, horaFim: string | null | undefined): number {
  const [hi, mi] = (horaInicio || "08:00").split(":").map(Number);
  const [hf, mf] = (horaFim || "12:00").split(":").map(Number);
  const hours = hf + mf / 60 - (hi + mi / 60);
  return Number.isFinite(hours) ? Math.max(0, hours) : 0;
}

function determineTurno(dataAula: string, horaInicio: string | null | undefined): "Diurno" | "Noturno" | "Sábado" {
  const d = new Date(`${dataAula}T00:00:00`);
  const day = d.getDay();
  if (day === 6) return "Sábado";
  const hora = parseInt((horaInicio || "08:00").split(":")[0] || "8", 10);
  if (hora >= 18) return "Noturno";
  return "Diurno";
}

function calcStatus(indice: number): "CRÍTICO" | "ATENÇÃO" | "ESTÁVEL" {
  if (indice > 0.1) return "CRÍTICO";
  if (indice > 0.05) return "ATENÇÃO";
  return "ESTÁVEL";
}

export const usePredictiveData = () => {
  const { user } = useAuth();

  const { data: raw, isLoading } = useQuery({
    queryKey: ["predictive-data", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          aulas: [] as any[],
          valoresHora: [] as { turno: string; valor_hora: number; ativo: boolean }[],
          valoresEstagio: [] as { custo_total_calculado: number; ativo: boolean }[],
          logsPreditivos: [] as { aula_id: string | null; tipo_alteracao: string }[],
        };
      }

      const [aulasRes, valoresHoraRes, valoresEstagioRes, logsRes] = await Promise.all([
        supabase
          .from("cronograma_mestre")
          .select(`
            id,
            data_aula,
            hora_inicio,
            hora_fim,
            valor_calculado,
            status_aula,
            status_financeiro,
            aceite_professor,
            turma_id,
            disciplina_id,
            professor_id,
            turma:turmas(id, nome),
            disciplina:cad_disciplinas(id, nome),
            professor:cad_professores(id, nome, valor_hora)
          `)
          .eq("user_id", user.id)
          .order("data_aula", { ascending: true }),
        supabase
          .from("tabela_valores_hora")
          .select("turno, valor_hora, ativo")
          .eq("user_id", user.id),
        supabase
          .from("valores_estagio")
          .select("custo_total_calculado, ativo")
          .eq("user_id", user.id),
        supabase
          .from("logs_preditivos")
          .select("aula_id, tipo_alteracao")
          .eq("user_id", user.id),
      ]);

      if (aulasRes.error) throw aulasRes.error;

      return {
        aulas: (aulasRes.data || []) as any[],
        valoresHora: (valoresHoraRes.data || []) as { turno: string; valor_hora: number; ativo: boolean }[],
        valoresEstagio: (valoresEstagioRes.data || []) as { custo_total_calculado: number; ativo: boolean }[],
        logsPreditivos: (logsRes.data || []) as { aula_id: string | null; tipo_alteracao: string }[],
      };
    },
    enabled: !!user?.id,
  });

  const computed = useMemo(() => {
    const aulas = raw?.aulas || [];
    const valoresHora = raw?.valoresHora || [];
    const valoresEstagio = raw?.valoresEstagio || [];
    const logsPreditivos = raw?.logsPreditivos || [];

    // ---- Lookup maps ----
    const valorHoraPorTurno = new Map<string, number>();
    valoresHora.forEach((v) => {
      if (v?.ativo && v?.turno) valorHoraPorTurno.set(String(v.turno), Number(v.valor_hora || 0));
    });

    // IDs de aulas que sofreram substituição nos logs
    const aulaSubstituida = new Set(
      logsPreditivos
        .filter((l) => l.tipo_alteracao === "Professor substituído" && l.aula_id)
        .map((l) => l.aula_id as string)
    );

    // ---- Agrupamento por turma + mês ----
    type TurmaMonthBucket = {
      turma_id: string;
      turma_nome: string;
      mes: string;
      mes_label: string;
      custo_base: number;
      substituicoes: number;
      total_aulas: number;
    };
    const buckets: Record<string, TurmaMonthBucket> = {};

    aulas.forEach((aula) => {
      if (!aula?.turma_id || !aula?.data_aula) return;
      if (String(aula.status_financeiro || "").toLowerCase() === "bloqueado") return;
      if (aula.status_aula === "Cancelada") return;

      const mesKey = toMesKey(aula.data_aula);
      const mesLabel = toMesLabel(aula.data_aula);
      const key = `${aula.turma_id}__${mesKey}`;

      if (!buckets[key]) {
        buckets[key] = {
          turma_id: aula.turma_id,
          turma_nome: aula.turma?.nome || "Sem turma",
          mes: mesKey,
          mes_label: mesLabel,
          custo_base: 0,
          substituicoes: 0,
          total_aulas: 0,
        };
      }

      const turno = determineTurno(aula.data_aula, aula.hora_inicio);
      const horas = parseHours(aula.hora_inicio, aula.hora_fim);
      const valorHora = valorHoraPorTurno.get(turno) ?? Number(aula.professor?.valor_hora || 50);
      const custo = horas * valorHora * (1 + DSR_RATE);

      buckets[key].custo_base += custo;
      buckets[key].total_aulas += 1;
      if (aulaSubstituida.has(String(aula.id))) {
        buckets[key].substituicoes += 1;
      }
    });

    // ---- Montar analysisData com fator de risco ----
    const analysisData: PredictiveAnalysis[] = Object.values(buckets).map((b) => {
      const indiceVol = b.total_aulas > 0 ? b.substituicoes / b.total_aulas : 0;
      const status = calcStatus(indiceVol);
      const fatorRisco = status === "CRÍTICO" ? RISCO_CRITICO_MULT : status === "ATENÇÃO" ? RISCO_ATENCAO_MULT : 1;
      const custoComRisco = Math.round(b.custo_base * fatorRisco * 100) / 100;
      return {
        user_id: user?.id || "",
        mes_referencia: b.mes,
        turma_id: b.turma_id,
        custo_planejado: Math.round(b.custo_base * 100) / 100,
        indice_volatilidade: indiceVol,
        status_risco: status,
        fator_risco: fatorRisco,
        custo_com_risco: custoComRisco,
      };
    });

    // ---- Hotspots por turma ----
    // Agrega todas as disciplinas por turma (pega info de disciplina e prof da primeira ocorrência)
    type TurmaBucket = {
      turma_id: string;
      turma: string;
      disciplina: string;
      professor_titular: string;
      total_aulas: number;
      substituicoes: number;
      custo_planejado: number;
    };
    const turmaBuckets: Record<string, TurmaBucket> = {};

    aulas.forEach((aula) => {
      if (!aula?.turma_id || !aula?.data_aula) return;
      if (String(aula.status_financeiro || "").toLowerCase() === "bloqueado") return;
      if (aula.status_aula === "Cancelada") return;

      const key = aula.turma_id;
      const turno = determineTurno(aula.data_aula, aula.hora_inicio);
      const horas = parseHours(aula.hora_inicio, aula.hora_fim);
      const valorHora = valorHoraPorTurno.get(turno) ?? Number(aula.professor?.valor_hora || 50);
      const custo = horas * valorHora * (1 + DSR_RATE);

      if (!turmaBuckets[key]) {
        turmaBuckets[key] = {
          turma_id: aula.turma_id,
          turma: aula.turma?.nome || "Sem turma",
          disciplina: aula.disciplina?.nome || "—",
          professor_titular: aula.professor?.nome || "—",
          total_aulas: 0,
          substituicoes: 0,
          custo_planejado: 0,
        };
      }

      turmaBuckets[key].total_aulas += 1;
      turmaBuckets[key].custo_planejado += custo;
      if (aulaSubstituida.has(String(aula.id))) {
        turmaBuckets[key].substituicoes += 1;
      }
    });

    const hotspotsData: HotspotTurma[] = Object.values(turmaBuckets).map((t) => {
      const percSubst = t.total_aulas > 0 ? t.substituicoes / t.total_aulas : 0;
      const status = calcStatus(percSubst);
      const fatorRisco = status === "CRÍTICO" ? RISCO_CRITICO_MULT : status === "ATENÇÃO" ? RISCO_ATENCAO_MULT : 1;
      const impacto = Math.round((t.custo_planejado * fatorRisco - t.custo_planejado) * 100) / 100;
      return {
        user_id: user?.id || "",
        turma_id: t.turma_id,
        turma: t.turma,
        disciplina: t.disciplina,
        professor_titular: t.professor_titular,
        total_aulas: t.total_aulas,
        total_substituicoes: t.substituicoes,
        percentual_substituicoes: percSubst,
        custo_planejado: Math.round(t.custo_planejado * 100) / 100,
        impacto_financeiro_estimado: impacto,
        status_risco: status,
      };
    }).sort((a, b) => b.impacto_financeiro_estimado - a.impacto_financeiro_estimado);

    // ---- Monthly data para gráfico ----
    const monthlyAgg: Record<string, { mes: string; custoBase: number; custoRisco: number }> = {};
    analysisData.forEach((item) => {
      const label = toMesLabel(item.mes_referencia + "-01");
      if (!monthlyAgg[item.mes_referencia]) {
        monthlyAgg[item.mes_referencia] = { mes: label, custoBase: 0, custoRisco: 0 };
      }
      monthlyAgg[item.mes_referencia].custoBase += item.custo_planejado;
      monthlyAgg[item.mes_referencia].custoRisco += item.custo_com_risco;
    });

    const monthlyData = Object.entries(monthlyAgg)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => ({
        mes: v.mes,
        custoBase: Math.round(v.custoBase * 100) / 100,
        custoRisco: Math.round(v.custoRisco * 100) / 100,
      }));

    // ---- Aulas pendentes de aceite ----
    const aulasPendentesAceite = aulas.filter(
      (a) => a.aceite_professor === false && a.status_aula !== "Cancelada"
    ).length;

    // ---- Horas no limite (>= 6h numa mesma data por professor) ----
    const horasPorProfData: Record<string, number> = {};
    aulas.forEach((a) => {
      if (!a?.professor_id || !a?.data_aula) return;
      if (a.status_aula === "Cancelada") return;
      const key = `${a.professor_id}__${a.data_aula}`;
      horasPorProfData[key] = (horasPorProfData[key] || 0) + parseHours(a.hora_inicio, a.hora_fim);
    });
    const horasNoLimite = Object.values(horasPorProfData).filter((h) => h >= 6).length;

    // ---- Stats ----
    const custoProjeto = analysisData.reduce((s, i) => s + i.custo_planejado, 0);
    const custoComRiscoTotal = analysisData.reduce((s, i) => s + i.custo_com_risco, 0);
    const volMedia = analysisData.length > 0
      ? (analysisData.reduce((s, i) => s + i.indice_volatilidade, 0) / analysisData.length) * 100
      : 0;

    const stats: PredictiveStats = {
      custoProjeto: Math.round(custoProjeto * 100) / 100,
      custoComRisco: Math.round(custoComRiscoTotal * 100) / 100,
      indiceVolatilidadeMedia: volMedia,
      turmasCriticas: hotspotsData.filter((h) => h.status_risco === "CRÍTICO").length,
      aulasPendentesAceite,
      horasNoLimite,
    };

    return { analysisData, hotspotsData, monthlyData, stats };
  }, [raw, user?.id]);

  return {
    analysisData: computed.analysisData,
    hotspotsData: computed.hotspotsData,
    stats: computed.stats,
    monthlyData: computed.monthlyData,
    isLoading,
  };
};
