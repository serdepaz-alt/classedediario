import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export const usePredictiveData = () => {
  // Buscar análise preditiva
  const { data: analysisData, isLoading: isLoadingAnalysis } = useQuery({
    queryKey: ["predictive-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_analise_preditiva" as any)
        .select("*");
      
      if (error) throw error;
      return (data as unknown) as PredictiveAnalysis[];
    },
  });

  // Buscar hotspots
  const { data: hotspotsData, isLoading: isLoadingHotspots } = useQuery({
    queryKey: ["hotspots-turmas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vw_hotspots_turmas" as any)
        .select("*");
      
      if (error) throw error;
      return (data as unknown) as HotspotTurma[];
    },
  });

  // Buscar aulas pendentes de aceite
  const { data: pendingClasses, isLoading: isLoadingPending } = useQuery({
    queryKey: ["pending-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select("id")
        .eq("aceite_professor", false);
      
      if (error) throw error;
      return data?.length || 0;
    },
  });

  // Calcular estatísticas agregadas
  const stats: PredictiveStats = {
    custoProjeto: analysisData?.reduce((sum, item) => sum + Number(item.custo_planejado || 0), 0) || 0,
    custoComRisco: analysisData?.reduce((sum, item) => sum + Number(item.custo_com_risco || 0), 0) || 0,
    indiceVolatilidadeMedia: analysisData?.length 
      ? (analysisData.reduce((sum, item) => sum + Number(item.indice_volatilidade || 0), 0) / analysisData.length) * 100
      : 0,
    turmasCriticas: hotspotsData?.filter(h => h.status_risco === "CRÍTICO").length || 0,
    aulasPendentesAceite: pendingClasses || 0,
    horasNoLimite: 0, // Será implementado com lógica de 8h/dia
  };

  // Agrupar dados por mês para gráficos
  const monthlyData = analysisData?.reduce((acc, item) => {
    const mes = item.mes_referencia ? new Date(item.mes_referencia).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) : 'N/A';
    const existing = acc.find(a => a.mes === mes);
    
    if (existing) {
      existing.custoBase += Number(item.custo_planejado || 0);
      existing.custoRisco += Number(item.custo_com_risco || 0);
    } else {
      acc.push({
        mes,
        custoBase: Number(item.custo_planejado || 0),
        custoRisco: Number(item.custo_com_risco || 0),
      });
    }
    return acc;
  }, [] as { mes: string; custoBase: number; custoRisco: number }[]) || [];

  return {
    analysisData,
    hotspotsData,
    stats,
    monthlyData,
    isLoading: isLoadingAnalysis || isLoadingHotspots || isLoadingPending,
  };
};
