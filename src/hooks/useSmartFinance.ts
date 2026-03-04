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

export const useSmartFinance = () => {
  const { user } = useAuth();

  const { data: rawData, isLoading } = useQuery({
    queryKey: ["smart-finance", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          id,
          data_aula,
          valor_calculado,
          status_aula,
          status_financeiro,
          turma_id,
          turma:turmas(id, nome)
        `)
        .eq("user_id", user.id)
        .order("data_aula", { ascending: true });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // Group by turma + month
  const byTurmaMonth = (rawData || []).reduce((acc, aula) => {
    if (!aula.turma_id || !aula.data_aula) return acc;

    const date = new Date(aula.data_aula);
    const mesKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const mesLabel = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    const key = `${aula.turma_id}__${mesKey}`;
    const valor = Number(aula.valor_calculado || 0);

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

    // Previsto = todas as aulas (exceto canceladas)
    if (aula.status_aula !== "Cancelada") {
      acc[key].custo_previsto += valor;
    }

    // Realizado = apenas aulas realizadas ou confirmadas
    if (aula.status_aula === "Realizada" || aula.status_aula === "Confirmada") {
      acc[key].custo_realizado += valor;
    }

    return acc;
  }, {} as Record<string, FinanceTurmaMonth>);

  const financeData: FinanceTurmaMonth[] = Object.values(byTurmaMonth as Record<string, FinanceTurmaMonth>).map((item: FinanceTurmaMonth) => ({
    ...item,
    desvio: item.custo_realizado - item.custo_previsto,
    desvio_percent: item.custo_previsto > 0
      ? ((item.custo_realizado - item.custo_previsto) / item.custo_previsto) * 100
      : 0,
  }));

  // Monthly aggregation for chart
  const monthlyAgg = financeData.reduce((acc, item) => {
    if (!acc[item.mes]) {
      acc[item.mes] = { mes: item.mes, mes_label: item.mes_label, custo_previsto: 0, custo_realizado: 0 };
    }
    acc[item.mes].custo_previsto += item.custo_previsto;
    acc[item.mes].custo_realizado += item.custo_realizado;
    return acc;
  }, {} as Record<string, { mes: string; mes_label: string; custo_previsto: number; custo_realizado: number }>);

  const monthlyData = Object.values(monthlyAgg).sort((a, b) => a.mes.localeCompare(b.mes));

  // Turma aggregation
  const turmaAgg = financeData.reduce((acc, item) => {
    if (!acc[item.turma_id]) {
      acc[item.turma_id] = { turma_id: item.turma_id, turma_nome: item.turma_nome, custo_previsto: 0, custo_realizado: 0 };
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
      desvio,
      desvio_percent: item.custo_previsto > 0
        ? (desvio / item.custo_previsto) * 100
        : 0,
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
  summary.desvio_percent = summary.total_previsto > 0
    ? (summary.desvio_total / summary.total_previsto) * 100
    : 0;

  return { financeData, monthlyData, turmaData, summary, isLoading };
};
