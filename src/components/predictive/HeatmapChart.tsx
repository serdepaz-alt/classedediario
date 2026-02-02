import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { HotspotTurma } from "@/hooks/usePredictiveData";

interface HeatmapChartProps {
  data: HotspotTurma[] | undefined;
  onSelectTurma?: (turmaId: string) => void;
}

export const HeatmapChart = ({ data, onSelectTurma }: HeatmapChartProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Agrupar por turma e calcular totais
  const chartData = data?.reduce((acc, item) => {
    const existing = acc.find(a => a.turma === item.turma);
    if (existing) {
      existing.custoBase += Number(item.custo_planejado || 0);
      existing.custoRisco += Number(item.impacto_financeiro_estimado || 0);
    } else {
      acc.push({
        turma: item.turma,
        turma_id: item.turma_id,
        custoBase: Number(item.custo_planejado || 0),
        custoRisco: Number(item.impacto_financeiro_estimado || 0),
        status: item.status_risco,
      });
    }
    return acc;
  }, [] as { turma: string; turma_id: string; custoBase: number; custoRisco: number; status: string }[]) || [];

  // Dados mock quando não houver dados
  const displayData = chartData.length > 0 ? chartData.slice(0, 6) : [
    { turma: "Saúde", turma_id: "1", custoBase: 85000, custoRisco: 12000, status: "ATENÇÃO" },
    { turma: "Direito", turma_id: "2", custoBase: 62000, custoRisco: 5000, status: "ESTÁVEL" },
    { turma: "Enfermagem", turma_id: "3", custoBase: 78000, custoRisco: 18000, status: "CRÍTICO" },
    { turma: "Odontologia", turma_id: "4", custoBase: 71000, custoRisco: 8000, status: "ATENÇÃO" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-elevated">
          <p className="font-medium text-sm mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-xs flex justify-between gap-4">
              <span className="text-success">Custo Base:</span>
              <span className="font-medium">{formatCurrency(payload[0]?.value || 0)}</span>
            </p>
            <p className="text-xs flex justify-between gap-4">
              <span className="text-destructive">Impacto Risco:</span>
              <span className="font-medium">+{formatCurrency(payload[1]?.value || 0)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleBarClick = (data: any) => {
    if (data && data.turma_id && onSelectTurma) {
      onSelectTurma(data.turma_id);
    }
  };

  return (
    <Card className="p-5 gradient-card shadow-card border-0">
      <h3 className="font-semibold text-foreground mb-4">
        Ocupação de Turmas por Curso
      </h3>
      
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={displayData} 
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis 
              type="number"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              dataKey="turma"
              type="category"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar
              dataKey="custoBase"
              name="Custo Base"
              stackId="a"
              fill="hsl(var(--success))"
              radius={[0, 0, 0, 0]}
              onClick={handleBarClick}
              cursor="pointer"
            />
            <Bar
              dataKey="custoRisco"
              name="Pico - Reposições de Risco"
              stackId="a"
              fill="hsl(var(--destructive))"
              radius={[0, 4, 4, 0]}
              onClick={handleBarClick}
              cursor="pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
