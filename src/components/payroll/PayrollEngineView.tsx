import { useState } from "react";
import { usePayrollEngine } from "@/hooks/usePayrollEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ContrachequePDF } from "@/components/payroll/ContrachequePDF";
import { Calculator, AlertTriangle, TrendingUp, Users, Clock, DollarSign, FileText } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const PayrollEngineView = () => {
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [mesRef, setMesRef] = useState(mesAtual);
  const { lineItems, summary, isLoading } = usePayrollEngine(mesRef);

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  // Group by professor for extrato
  const byProfessor: Record<string, typeof lineItems> = {};
  lineItems.forEach((item) => {
    if (!byProfessor[item.professor_id]) byProfessor[item.professor_id] = [];
    byProfessor[item.professor_id].push(item);
  });

  return (
    <div className="space-y-6">
      {/* Month Selector + KPIs */}
      <div className="flex items-center gap-4">
        <Input type="month" value={mesRef} onChange={(e) => setMesRef(e.target.value)} className="w-48 h-9" max={mesAtual} />
        <p className="text-sm text-muted-foreground">Mês de Referência</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground uppercase">Total Bruto</p></div>
          <p className="text-xl font-bold">{fmt(summary.total_bruto)}</p>
        </CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-accent" /><p className="text-xs text-muted-foreground uppercase">DSR (16.67%)</p></div>
          <p className="text-xl font-bold">{fmt(summary.total_dsr)}</p>
        </CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-warning" /><p className="text-xs text-muted-foreground uppercase">Estágios</p></div>
          <p className="text-xl font-bold">{fmt(summary.total_estagios)}</p>
        </CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Calculator className="w-4 h-4 text-destructive" /><p className="text-xs text-muted-foreground uppercase">Total Geral</p></div>
          <p className="text-2xl font-bold text-primary">{fmt(summary.total_geral)}</p>
        </CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground uppercase">Professores</p></div>
          <p className="text-xl font-bold">{summary.professores_count}</p>
          <p className="text-xs text-muted-foreground">{summary.horas_totais.toFixed(0)}h totais</p>
        </CardContent></Card>
      </div>

      {/* Compliance Alerts */}
      {summary.alertas.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-warning" /> Alertas de Conformidade ({summary.alertas.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {summary.alertas.map((a, i) => (
              <p key={i} className="text-sm text-muted-foreground">{a}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Extrato de Conferência por Professor */}
      {Object.entries(byProfessor).map(([profId, items]) => {
        const profTotal = items.reduce((s, i) => s + i.total_geral, 0);
        return (
          <Card key={profId}>
            <CardHeader className="pb-2 flex-row items-center justify-between">
              <CardTitle className="text-base">{items[0].professor_nome}</CardTitle>
              <div className="flex items-center gap-2">
                <ContrachequePDF professorNome={items[0].professor_nome} professorId={profId} mesReferencia={mesRef} items={items} />
                <Badge variant="outline" className="text-sm font-mono">{fmt(profTotal)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 text-xs">
                    <TableHead>Turma</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Valor/h</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">DSR</TableHead>
                    <TableHead className="text-right">Estágio</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{item.turma_nome}</TableCell>
                      <TableCell className="text-sm font-medium">{item.disciplina_nome}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{item.turno}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{item.horas_realizadas}h</TableCell>
                      <TableCell className="text-right font-mono">{fmt(item.valor_hora)}</TableCell>
                      <TableCell className="text-right font-mono">{fmt(item.subtotal_aulas)}</TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">{fmt(item.dsr)}</TableCell>
                      <TableCell className="text-right font-mono">{item.total_estagio > 0 ? fmt(item.total_estagio) : "—"}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-primary">{fmt(item.total_geral)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {lineItems.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum dado de cronograma encontrado para {mesRef}</p>
        </CardContent></Card>
      )}
    </div>
  );
};
