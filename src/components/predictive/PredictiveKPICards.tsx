import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Activity, Clock, Bell, TrendingUp, TrendingDown } from "lucide-react";
import { PredictiveStats } from "@/hooks/usePredictiveData";

interface PredictiveKPICardsProps {
  stats: PredictiveStats;
}

export const PredictiveKPICards = ({ stats }: PredictiveKPICardsProps) => {
  const riskPercentage = stats.custoProjeto > 0 
    ? ((stats.custoComRisco - stats.custoProjeto) / stats.custoProjeto * 100).toFixed(1)
    : "0";
  
  const isOverBudget = Number(riskPercentage) > 0;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Custo Projetado */}
      <Card className="p-5 gradient-card shadow-card border-0 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Custo Projetado (Semestre)
            </p>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(stats.custoProjeto)}
            </p>
            {isOverBudget && (
              <Badge variant="destructive" className="mt-2 text-xs">
                +{riskPercentage}% acima do Budget
              </Badge>
            )}
          </div>
          <div className="w-11 h-11 bg-success/10 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-success" />
          </div>
        </div>
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          {isOverBudget ? (
            <TrendingUp className="w-3 h-3 text-destructive" />
          ) : (
            <TrendingDown className="w-3 h-3 text-success" />
          )}
          <span>vs. Semestre Anterior</span>
        </div>
      </Card>

      {/* Card 2: Índice de Volatilidade */}
      <Card className="p-5 gradient-card shadow-card border-0 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Fator de Volatilidade (Médio)
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.custoComRisco)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.indiceVolatilidadeMedia > 10 ? (
                <span className="text-destructive">- {stats.indiceVolatilidadeMedia.toFixed(1)}% abaixo risco</span>
              ) : (
                <span className="text-success">Risco controlado</span>
              )}
            </p>
          </div>
          <div className="relative w-14 h-14">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke={stats.indiceVolatilidadeMedia > 10 ? "hsl(var(--destructive))" : "hsl(var(--success))"}
                strokeWidth="3"
                strokeDasharray={`${Math.min(stats.indiceVolatilidadeMedia, 100)}, 100`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {stats.indiceVolatilidadeMedia.toFixed(0)}%
            </span>
          </div>
        </div>
      </Card>

      {/* Card 3: Horas no Limite */}
      <Card className="p-5 gradient-card shadow-card border-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Horas "No Limite"
            </p>
            <p className="text-2xl font-bold text-warning">
              {stats.horasNoLimite}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Professores próximos das 8h diárias
            </p>
          </div>
          <div className="w-11 h-11 bg-warning/10 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-warning" />
          </div>
        </div>
      </Card>

      {/* Card 4: Aulas Pendentes */}
      <Card className="p-5 gradient-card shadow-card border-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Aulas Pendentes de Aceite
            </p>
            <p className="text-2xl font-bold text-primary">
              {stats.aulasPendentesAceite}
            </p>
            <Button variant="outline" size="sm" className="mt-2 h-7 text-xs">
              <Bell className="w-3 h-3 mr-1" />
              Notificar Todos
            </Button>
          </div>
          <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-primary" />
          </div>
        </div>
      </Card>
    </div>
  );
};
