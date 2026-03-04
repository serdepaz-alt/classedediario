import { useSmartFinance } from "@/hooks/useSmartFinance";
import { SmartFinanceKPIs } from "./SmartFinanceKPIs";
import { SmartFinanceMonthlyChart } from "./SmartFinanceMonthlyChart";
import { SmartFinanceTurmaChart } from "./SmartFinanceTurmaChart";
import { SmartFinanceTable } from "./SmartFinanceTable";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from "lucide-react";

export const SmartFinanceDashboard = () => {
  const { monthlyData, turmaData, summary, financeData, isLoading } = useSmartFinance();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Smart Finance</h1>
          <p className="text-sm text-muted-foreground">
            Custo Previsto vs. Realizado por turma e mês
          </p>
        </div>
      </div>

      {/* KPIs */}
      <SmartFinanceKPIs summary={summary} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SmartFinanceMonthlyChart data={monthlyData} />
        <SmartFinanceTurmaChart data={turmaData} />
      </div>

      {/* Detail Table */}
      <SmartFinanceTable data={financeData} />

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
        <span>
          Última Atualização:{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span>Baseado em dados do cronograma mestre</span>
      </div>
    </div>
  );
};
