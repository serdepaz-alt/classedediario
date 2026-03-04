import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { FinanceTurmaMonth } from "@/hooks/useSmartFinance";

interface Props {
  data: FinanceTurmaMonth[];
}

const formatCurrency = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const SmartFinanceTurmaChart = ({ data }: Props) => {
  const chartData = data.map((d) => ({
    nome: d.turma_nome.length > 15 ? d.turma_nome.slice(0, 15) + "…" : d.turma_nome,
    custo_previsto: d.custo_previsto,
    custo_realizado: d.custo_realizado,
    desvio: d.desvio,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Previsto vs. Realizado / Turma</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            Sem turmas para exibir
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="nome" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "custo_previsto" ? "Previsto" : "Realizado",
                ]}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Legend
                formatter={(value) =>
                  value === "custo_previsto" ? "Previsto" : "Realizado"
                }
              />
              <Bar dataKey="custo_previsto" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custo_realizado" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
