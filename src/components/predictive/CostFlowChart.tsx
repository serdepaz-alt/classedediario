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

  // Dados mock para demonstração quando não houver dados reais
  const chartData = data.length > 0 ? data : [
    { mes: "Jan/25", custoBase: 45000, custoRisco: 48000 },
    { mes: "Fev/25", custoBase: 52000, custoRisco: 58000 },
    { mes: "Mar/25", custoBase: 48000, custoRisco: 52000 },
    { mes: "Abr/25", custoBase: 61000, custoRisco: 70000 },
    { mes: "Mai/25", custoBase: 55000, custoRisco: 62000 },
    { mes: "Jun/25", custoBase: 49000, custoRisco: 53000 },
  ];

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
            <Legend 
              wrapperStyle={{ fontSize: 12 }}
              iconType="line"
            />
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
              name="Pico - Reposições (Previsão)"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: "hsl(var(--destructive))", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
