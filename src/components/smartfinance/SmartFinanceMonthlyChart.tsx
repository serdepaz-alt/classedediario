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
} from "recharts";

interface DataPoint {
  mes: string;
  mes_label: string;
  custo_previsto: number;
  custo_realizado: number;
}

interface Props {
  data: DataPoint[];
}

const formatCurrency = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const SmartFinanceMonthlyChart = ({ data }: Props) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Previsto vs. Realizado / Mês</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
            Sem dados de cronograma para exibir
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="mes_label" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "custo_previsto" ? "Previsto" : "Realizado",
                ]}
                labelFormatter={(label) => `Mês: ${label}`}
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
