import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface CostFlowChartProps {
  data: { mes: string; custoBase: number; custoRisco: number }[];
}

export const CostFlowChart = ({ data }: CostFlowChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartData = data;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const gap = payload[1]?.value - payload[0]?.value;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-elevated">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-xs flex justify-between gap-4">
              <span className="text-primary">Custo Base:</span>
              <span className="font-medium">{formatCurrency(payload[0]?.value || 0)}</span>
            </p>
            <p className="text-xs flex justify-between gap-4">
              <span className="text-destructive">Com Risco:</span>
              <span className="font-medium">{formatCurrency(payload[1]?.value || 0)}</span>
            </p>
            {gap > 0 && (
              <p className="text-xs flex justify-between gap-4 pt-1 border-t border-border mt-1">
                <span className="text-muted-foreground">Gap de Risco:</span>
                <span className="font-medium text-destructive">+{formatCurrency(gap)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-5 gradient-card shadow-card border-0">
      <h3 className="font-semibold text-foreground mb-4">
        Projeção de Fluxo de Caixa Futuro
      </h3>

      {chartData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
          Sem dados de cronograma para exibir projeção
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="line" />
              <Line
                type="monotone"
                dataKey="custoBase"
                name="Custo Base"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="custoRisco"
                name="Pico — Reposições (Previsão)"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};
