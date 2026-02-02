import { useState } from "react";
import { usePredictiveData } from "@/hooks/usePredictiveData";
import { PredictiveKPICards } from "./PredictiveKPICards";
import { OracleInsight } from "./OracleInsight";
import { CostFlowChart } from "./CostFlowChart";
import { HeatmapChart } from "./HeatmapChart";
import { HotspotsTable } from "./HotspotsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Filter, Download } from "lucide-react";

export const PredictiveDashboard = () => {
  const { stats, monthlyData, hotspotsData, isLoading } = usePredictiveData();
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null);

  const handleSelectTurma = (turmaId: string) => {
    setSelectedTurmaId(prev => prev === turmaId ? null : turmaId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-24" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Análise Preditiva & Inteligência Estratégica
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão do futuro financeiro e operacional
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="default" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <PredictiveKPICards stats={stats} />

      {/* Oracle Insight */}
      <OracleInsight hotspots={hotspotsData} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CostFlowChart data={monthlyData} />
        <HeatmapChart data={hotspotsData} onSelectTurma={handleSelectTurma} />
      </div>

      {/* Hotspots Table */}
      <HotspotsTable data={hotspotsData} selectedTurmaId={selectedTurmaId} />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
        <span>Última Atualização: {new Date().toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: 'long', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</span>
        <span>Dados atualizados em tempo real via triggers</span>
      </div>
    </div>
  );
};
