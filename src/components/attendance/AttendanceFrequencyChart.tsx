import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart3, TrendingUp } from "lucide-react";

interface AttendanceRecord {
  data: string;
  status: string;
}

interface AttendanceFrequencyChartProps {
  records: AttendanceRecord[];
  viewMode?: "daily" | "weekly";
}

export const AttendanceFrequencyChart = ({
  records,
  viewMode = "daily",
}: AttendanceFrequencyChartProps) => {
  const chartData = useMemo(() => {
    if (records.length === 0) return [];

    // Group by date and count statuses
    const dateMap = new Map<string, { presente: number; ausente: number; atrasado: number }>();

    records.forEach((r) => {
      const dateKey = r.data;
      const current = dateMap.get(dateKey) || { presente: 0, ausente: 0, atrasado: 0 };
      
      if (r.status === "presente") current.presente++;
      else if (r.status === "ausente") current.ausente++;
      else if (r.status === "atrasado") current.atrasado++;
      
      dateMap.set(dateKey, current);
    });

    // Sort by date and format for chart
    const sortedData = Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // Last 14 days
      .map(([date, counts]) => {
        const total = counts.presente + counts.ausente + counts.atrasado;
        const frequenciaPercent = total > 0 ? Math.round((counts.presente / total) * 100) : 0;
        
        return {
          date: format(parseISO(date), "dd/MM", { locale: ptBR }),
          dateLabel: format(parseISO(date), "EEE dd", { locale: ptBR }),
          presentes: counts.presente,
          ausentes: counts.ausente,
          atrasados: counts.atrasado,
          frequencia: frequenciaPercent,
        };
      });

    return sortedData;
  }, [records]);

  const overallStats = useMemo(() => {
    if (records.length === 0) return { frequencia: 0, pontualidade: 0, trend: "stable" };

    const total = records.length;
    const presentes = records.filter((r) => r.status === "presente").length;
    const atrasados = records.filter((r) => r.status === "atrasado").length;

    const frequencia = Math.round((presentes / total) * 100);
    const pontualidade = presentes + atrasados > 0
      ? Math.round((presentes / (presentes + atrasados)) * 100)
      : 100;

    // Calculate trend (compare last 7 days vs previous 7)
    const sortedRecords = [...records].sort((a, b) => b.data.localeCompare(a.data));
    const recentRecords = sortedRecords.slice(0, Math.min(7, sortedRecords.length));
    const olderRecords = sortedRecords.slice(7, Math.min(14, sortedRecords.length));

    let trend: "up" | "down" | "stable" = "stable";
    if (recentRecords.length > 0 && olderRecords.length > 0) {
      const recentRate = recentRecords.filter((r) => r.status === "presente").length / recentRecords.length;
      const olderRate = olderRecords.filter((r) => r.status === "presente").length / olderRecords.length;
      if (recentRate > olderRate + 0.1) trend = "up";
      else if (recentRate < olderRate - 0.1) trend = "down";
    }

    return { frequencia, pontualidade, trend };
  }, [records]);

  if (records.length === 0) {
    return (
      <Card className="p-6 text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-muted-foreground">
          Sem dados de frequência para exibir o gráfico
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Evolução da Frequência</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {overallStats.frequencia}% média
          </Badge>
          {overallStats.trend === "up" && (
            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">
              <TrendingUp className="w-3 h-3 mr-1" />
              Melhorando
            </Badge>
          )}
          {overallStats.trend === "down" && (
            <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">
              <TrendingUp className="w-3 h-3 mr-1 rotate-180" />
              Atenção
            </Badge>
          )}
        </div>
      </div>

      {/* Bar Chart - Stacked by status */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value, name) => {
                const labels: Record<string, string> = {
                  presentes: "Presentes",
                  ausentes: "Ausentes",
                  atrasados: "Atrasados",
                };
                return [value, labels[name as string] || name];
              }}
            />
            <Legend 
              formatter={(value) => {
                const labels: Record<string, string> = {
                  presentes: "Presentes",
                  ausentes: "Ausentes",
                  atrasados: "Atrasados",
                };
                return labels[value] || value;
              }}
            />
            <Bar dataKey="presentes" stackId="a" fill="hsl(142, 76%, 36%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="atrasados" stackId="a" fill="hsl(48, 96%, 53%)" radius={[0, 0, 0, 0]} />
            <Bar dataKey="ausentes" stackId="a" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Line Chart - Frequency trend */}
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="dateLabel" 
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              formatter={(value) => [`${value}%`, "Frequência"]}
            />
            <Line
              type="monotone"
              dataKey="frequencia"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-primary">{overallStats.frequencia}%</p>
          <p className="text-xs text-muted-foreground">Frequência Geral</p>
        </div>
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-2xl font-bold text-primary">{overallStats.pontualidade}%</p>
          <p className="text-xs text-muted-foreground">Taxa de Pontualidade</p>
        </div>
      </div>
    </Card>
  );
};
