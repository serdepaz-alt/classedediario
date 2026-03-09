import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface FinanceTurmaMonth {
  turma_id: string;
  turma_nome: string;
  mes: string;
  mes_label: string;
  custo_previsto: number;
  custo_realizado: number;
  desvio: number;
  desvio_percent: number;
}

export interface FinanceSummary {
  total_previsto: number;
  total_realizado: number;
  desvio_total: number;
  desvio_percent: number;
  turmas_acima_orcamento: number;
  turmas_dentro_orcamento: number;
}

const DSR_RATE = 0.1667; // 16.67% (mesma regra do Payroll Engine)

function toMesKey(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toMesLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function normalizeMesReferencia(mesRef: string): string {
  // Aceita 'YYYY-MM' ou 'YYYY-MM-DD'
  return mesRef?.length >= 7 ? mesRef.slice(0, 7) : mesRef;
}

function parseHours(horaInicio: string | null | undefined, horaFim: string | null | undefined): number {
  const [hi, mi] = (horaInicio || "08:00").split(":").map(Number);
  const [hf, mf] = (horaFim || "12:00").split(":").map(Number);
  const hours = (hf + mf / 60) - (hi + mi / 60);
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

export const useSmartFinance = () => {
  const { user } = useAuth();

  const { data: raw, isLoading } = useQuery({
    queryKey: ["smart-finance", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return {
          aulas: [] as any[],
          folhas: [] as { mes_referencia: string; status: string }[],
          valoresHora: [] as { turno: string; valor_hora: number; ativo: boolean }[],
          valoresEstagio: [] as { custo_total_calculado: number; ativo: boolean }[],
        };
      }

      const [aulasRes, folhasRes, valoresHoraRes, valoresEstagioRes] = await Promise.all([
        supabase
          .from("cronograma_mestre")
          .select(
            `
            id,
            data_aula,
            hora_inicio,
            hora_fim,
            valor_calculado,
            status_aula,
            status_financeiro,
            turma_id,
            disciplina_id,
            professor_id,
            turma:turmas(id, nome),
            disciplina:cad_disciplinas(id, nome),
            professor:cad_professores(id, nome, valor_hora)
          `
          )
          .eq("user_id", user.id)
          .order("data_aula", { ascending: true }),
        supabase
          .from("folha_fechamento")
          .select("mes_referencia, status")
          .eq("user_id", user.id),
        supabase
          .from("tabela_valores_hora")
          .select("turno, valor_hora, ativo")
          .eq("user_id", user.id),
        supabase
          .from("valores_estagio")
          .select("custo_total_calculado, ativo")
          .eq("user_id", user.id),
      ]);

      if (aulasRes.error) throw aulasRes.error;
      if (folhasRes.error) throw folhasRes.error;
      if (valoresHoraRes.error) throw valoresHoraRes.error;
      if (valoresEstagioRes.error) throw valoresEstagioRes.error;

      return {
        aulas: (aulasRes.data || []) as any[],
        folhas: (folhasRes.data || []) as { mes_referencia: string; status: string }[],
        valoresHora: (valoresHoraRes.data || []) as { turno: string; valor_hora: number; ativo: boolean }[],
        valoresEstagio: (valoresEstagioRes.data || []) as { custo_total_calculado: number; ativo: boolean }[],
      };
    },
    enabled: !!user?.id,
  });

  const computed = useMemo(() => {
    const aulas = raw?.aulas || [];
    const folhas = raw?.folhas || [];
    const valoresHora = raw?.valoresHora || [];
    const valoresEstagio = raw?.valoresEstagio || [];

    const mesesFechados = new Set(
      folhas
        .filter((f) => String(f.status).toLowerCase() === "fechada")
        .map((f) => normalizeMesReferencia(String(f.mes_referencia)))
    );

    const valorHoraPorTurno = new Map<string, number>();
    valoresHora.forEach((v) => {
      if (!v?.ativo) return;
      if (!v?.turno) return;
      valorHoraPorTurno.set(String(v.turno), Number(v.valor_hora || 0));
    });

    const estagioAtivoTotal = valoresEstagio
      .filter((e) => e?.ativo)
      .reduce((s, e) => s + Number(e.custo_total_calculado || 0), 0);

    // Group by turma + month
    const byTurmaMonth = aulas.reduce((acc, aula) => {
      if (!aula?.turma_id || !aula?.data_aula) return acc;

      // Se estiver bloqueado financeiramente, não entra em previsto nem em realizado
      if (String(aula.status_financeiro || "").toLowerCase() === "bloqueado") return acc;

      const mesKey = toMesKey(aula.data_aula);
      const mesLabel = toMesLabel(aula.data_aula);
      const key = `${aula.turma_id}__${mesKey}`;

      if (!acc[key]) {
        acc[key] = {
          turma_id: aula.turma_id,
          turma_nome: aula.turma?.nome || "Sem turma",
          mes: mesKey,
          mes_label: mesLabel,
          custo_previsto: 0,
          custo_realizado: 0,
          desvio: 0,
          desvio_percent: 0,
        };
      }

      const horas = parseHours(aula.hora_inicio, aula.hora_fim);
      const turno = determineTurno(aula.data_aula, aula.hora_inicio);
      const valorHora =
        valorHoraPorTurno.get(turno) ??
        Number(aula.professor?.valor_hora || 50);

      const baseAula = horas * Number(valorHora || 0);
      const dsr = baseAula * DSR_RATE;
      const custoAulaComDsr = baseAula + dsr;

      // Previsto = todas as aulas (exceto canceladas)
      if (aula.status_aula !== "Cancelada") {
        acc[key].custo_previsto += custoAulaComDsr;
      }

      // Realizado (pagamento) = apenas meses com folha fechada + aulas confirmadas/realizadas
      const mesFechado = mesesFechados.has(mesKey);
      if (mesFechado && (aula.status_aula === "Realizada" || aula.status_aula === "Confirmada")) {
        acc[key].custo_realizado += custoAulaComDsr;
      }

      return acc;
    }, {} as Record<string, FinanceTurmaMonth>);

    // Adiciona custo de estágio 1x por (professor+turma+disciplina+mês) quando a disciplina for estágio
    if (estagioAtivoTotal > 0) {
      const stageSeen = new Set<string>();
      aulas.forEach((aula) => {
        if (!aula?.turma_id || !aula?.data_aula) return;
        if (String(aula.status_financeiro || "").toLowerCase() === "bloqueado") return;
        if (aula.status_aula === "Cancelada") return;

        const discNome = String(aula.disciplina?.nome || "").toLowerCase();
        const isEstagio = discNome.includes("estágio") || discNome.includes("estagio");
        if (!isEstagio) return;

        const mesKey = toMesKey(aula.data_aula);
        const monthTurmaKey = `${aula.turma_id}__${mesKey}`;
        const groupKey = `${aula.professor_id || "sem_prof"}__${aula.turma_id}__${aula.disciplina_id || "sem_disc"}__${mesKey}`;
        if (stageSeen.has(groupKey)) return;
        stageSeen.add(groupKey);

        const bucket = byTurmaMonth[monthTurmaKey];
        if (!bucket) return;

        bucket.custo_previsto += estagioAtivoTotal;
        if (mesesFechados.has(mesKey)) {
          bucket.custo_realizado += estagioAtivoTotal;
        }
      });
    }

    const financeData: FinanceTurmaMonth[] = Object.values(byTurmaMonth).map((item) => ({
      ...item,
      custo_previsto: Math.round(item.custo_previsto * 100) / 100,
      custo_realizado: Math.round(item.custo_realizado * 100) / 100,
      desvio: (Math.round((item.custo_realizado - item.custo_previsto) * 100) / 100),
      desvio_percent:
        item.custo_previsto > 0
          ? ((item.custo_realizado - item.custo_previsto) / item.custo_previsto) * 100
          : 0,
    }));

    // Monthly aggregation for chart
    const monthlyAgg = financeData.reduce((acc, item) => {
      if (!acc[item.mes]) {
        acc[item.mes] = {
          mes: item.mes,
          mes_label: item.mes_label,
          custo_previsto: 0,
          custo_realizado: 0,
        };
      }
      acc[item.mes].custo_previsto += item.custo_previsto;
      acc[item.mes].custo_realizado += item.custo_realizado;
      return acc;
    }, {} as Record<string, { mes: string; mes_label: string; custo_previsto: number; custo_realizado: number }>);

    const monthlyData = Object.values(monthlyAgg)
      .map((m) => ({
        ...m,
        custo_previsto: Math.round(m.custo_previsto * 100) / 100,
        custo_realizado: Math.round(m.custo_realizado * 100) / 100,
      }))
      .sort((a, b) => a.mes.localeCompare(b.mes));

    // Turma aggregation
    const turmaAgg = financeData.reduce((acc, item) => {
      if (!acc[item.turma_id]) {
        acc[item.turma_id] = {
          turma_id: item.turma_id,
          turma_nome: item.turma_nome,
          custo_previsto: 0,
          custo_realizado: 0,
        };
      }
      acc[item.turma_id].custo_previsto += item.custo_previsto;
      acc[item.turma_id].custo_realizado += item.custo_realizado;
      return acc;
    }, {} as Record<string, { turma_id: string; turma_nome: string; custo_previsto: number; custo_realizado: number }>);

    const turmaData: FinanceTurmaMonth[] = Object.values(turmaAgg).map((item) => {
      const desvio = item.custo_realizado - item.custo_previsto;
      return {
        ...item,
        mes: "",
        mes_label: "",
        desvio: Math.round(desvio * 100) / 100,
        desvio_percent: item.custo_previsto > 0 ? (desvio / item.custo_previsto) * 100 : 0,
      };
    });

    // Summary
    const summary: FinanceSummary = {
      total_previsto: turmaData.reduce((s, t) => s + t.custo_previsto, 0),
      total_realizado: turmaData.reduce((s, t) => s + t.custo_realizado, 0),
      desvio_total: 0,
      desvio_percent: 0,
      turmas_acima_orcamento: turmaData.filter((t) => t.desvio > 0).length,
      turmas_dentro_orcamento: turmaData.filter((t) => t.desvio <= 0).length,
    };
    summary.desvio_total = summary.total_realizado - summary.total_previsto;
    summary.desvio_percent = summary.total_previsto > 0 ? (summary.desvio_total / summary.total_previsto) * 100 : 0;

    // arredondamento final
    summary.total_previsto = Math.round(summary.total_previsto * 100) / 100;
    summary.total_realizado = Math.round(summary.total_realizado * 100) / 100;
    summary.desvio_total = Math.round(summary.desvio_total * 100) / 100;

    return { financeData, monthlyData, turmaData, summary };
  }, [raw]);

  return {
    financeData: computed.financeData,
    monthlyData: computed.monthlyData,
    turmaData: computed.turmaData,
    summary: computed.summary,
    isLoading,
  };
};
