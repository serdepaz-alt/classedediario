import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FinanceTurmaMonth } from "@/hooks/useSmartFinance";

interface Props {
  data: FinanceTurmaMonth[];
}

const formatCurrency = (val: number) =>
  val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getDesvioStatus = (percent: number) => {
  if (percent > 10) return { label: "ACIMA", variant: "destructive" as const };
  if (percent < -10) return { label: "ABAIXO", variant: "secondary" as const };
  return { label: "OK", variant: "default" as const };
};

export const SmartFinanceTable = ({ data }: Props) => {
  const sorted = [...data].sort((a, b) => b.desvio_percent - a.desvio_percent);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Detalhamento por Turma / Mês</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum dado financeiro disponível
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">Previsto</TableHead>
                  <TableHead className="text-right">Realizado</TableHead>
                  <TableHead className="text-right">Desvio</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row, i) => {
                  const status = getDesvioStatus(row.desvio_percent);
                  return (
                    <TableRow key={`${row.turma_id}-${row.mes}-${i}`}>
                      <TableCell className="font-medium">{row.turma_nome}</TableCell>
                      <TableCell className="capitalize">{row.mes_label}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.custo_previsto)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.custo_realizado)}</TableCell>
                      <TableCell className="text-right">
                        <span className={row.desvio > 0 ? "text-destructive" : "text-emerald-600"}>
                          {row.desvio >= 0 ? "+" : ""}
                          {row.desvio_percent.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
