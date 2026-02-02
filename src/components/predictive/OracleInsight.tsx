import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Eye, RefreshCw } from "lucide-react";
import { HotspotTurma } from "@/hooks/usePredictiveData";

interface OracleInsightProps {
  hotspots: HotspotTurma[] | undefined;
}

export const OracleInsight = ({ hotspots }: OracleInsightProps) => {
  const criticalHotspot = hotspots?.find(h => h.status_risco === "CRÍTICO");
  const attentionHotspots = hotspots?.filter(h => h.status_risco === "ATENÇÃO") || [];
  
  const hasInsight = criticalHotspot || attentionHotspots.length > 0;
  
  const getInsightMessage = () => {
    if (criticalHotspot) {
      const percentage = (criticalHotspot.percentual_substituicoes * 100).toFixed(0);
      return {
        title: "Atenção Preditiva",
        message: `A disciplina '${criticalHotspot.disciplina}' na turma '${criticalHotspot.turma}' apresenta uma tendência de ${percentage}% de custo extra para o próximo mês. Motivo: Alto índice histórico de substituições de professores.`,
        severity: "critical" as const,
        turmaId: criticalHotspot.turma_id,
      };
    }
    
    if (attentionHotspots.length > 0) {
      return {
        title: "Alerta Preventivo",
        message: `${attentionHotspots.length} turma(s) estão em zona de atenção para custos. Monitoramento preventivo recomendado.`,
        severity: "warning" as const,
        turmaId: attentionHotspots[0]?.turma_id,
      };
    }
    
    return {
      title: "Sistema Estável",
      message: "Todas as turmas estão operando dentro dos parâmetros de custo esperados. Nenhuma ação imediata necessária.",
      severity: "stable" as const,
      turmaId: null,
    };
  };
  
  const insight = getInsightMessage();
  
  const severityStyles = {
    critical: "bg-destructive/10 border-destructive/50 text-destructive",
    warning: "bg-warning/10 border-warning/50 text-warning-foreground",
    stable: "bg-success/10 border-success/50 text-success",
  };

  return (
    <Card className={`p-5 border-2 ${severityStyles[insight.severity]}`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          insight.severity === "critical" ? "bg-destructive" :
          insight.severity === "warning" ? "bg-warning" : "bg-success"
        }`}>
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-foreground">{insight.title}</h3>
            <span className="text-xs text-muted-foreground">(Análise de IA)</span>
          </div>
          
          <p className="text-sm text-foreground/80 mb-4">
            {insight.message}
          </p>
          
          {insight.turmaId && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8">
                <Eye className="w-3 h-3 mr-1" />
                Ver Detalhes da Turma
              </Button>
              <Button variant="ghost" size="sm" className="h-8">
                <RefreshCw className="w-3 h-3 mr-1" />
                Simular Troca de Horário
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
