import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";
import type { FinanceSummary } from "@/hooks/useSmartFinance";

interface Props {
  summary: FinanceSummary;
}

const formatCurrency = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const SmartFinanceKPIs = ({ summary }: Props) => {
  const desvioPositivo = summary.desvio_total > 0;

  const cards = [
    {
      label: "Custo Previsto",
      value: formatCurrency(summary.total_previsto),
      icon: DollarSign,
      accent: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Custo Realizado",
      value: formatCurrency(summary.total_realizado),
      icon: desvioPositivo ? TrendingUp : TrendingDown,
      accent: desvioPositivo ? "text-destructive" : "text-emerald-600",
      bg: desvioPositivo ? "bg-destructive/10" : "bg-emerald-500/10",
    },
    {
      label: "Desvio Orçamentário",
      value: `${summary.desvio_percent >= 0 ? "+" : ""}${summary.desvio_percent.toFixed(1)}%`,
      subtitle: formatCurrency(summary.desvio_total),
      icon: AlertTriangle,
      accent: Math.abs(summary.desvio_percent) > 10 ? "text-destructive" : "text-amber-600",
      bg: Math.abs(summary.desvio_percent) > 10 ? "bg-destructive/10" : "bg-amber-500/10",
    },
    {
      label: "Turmas no Orçamento",
      value: `${summary.turmas_dentro_orcamento}/${summary.turmas_dentro_orcamento + summary.turmas_acima_orcamento}`,
      icon: CheckCircle,
      accent: "text-emerald-600",
      bg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="border">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold text-foreground">{card.value}</p>
                  {card.subtitle && (
                    <p className={`text-xs font-medium ${card.accent}`}>{card.subtitle}</p>
                  )}
                </div>
                <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.accent}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
