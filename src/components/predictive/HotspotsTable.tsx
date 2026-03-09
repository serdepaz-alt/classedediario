import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HotspotTurma } from "@/hooks/usePredictiveData";

interface HotspotsTableProps {
  data: HotspotTurma[] | undefined;
  selectedTurmaId?: string | null;
}

export const HotspotsTable = ({ data, selectedTurmaId }: HotspotsTableProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CRÍTICO":
        return <Badge variant="destructive" className="text-xs">🔴 CRÍTICO</Badge>;
      case "ATENÇÃO":
        return <Badge className="bg-warning text-warning-foreground text-xs">🟡 ATENÇÃO</Badge>;
      default:
        return <Badge className="bg-success text-success-foreground text-xs">🟢 ESTÁVEL</Badge>;
    }
  };

  const displayData = (data || [])
    .filter((item) => !selectedTurmaId || item.turma_id === selectedTurmaId)
    .sort((a, b) => Number(b.impacto_financeiro_estimado) - Number(a.impacto_financeiro_estimado));

  return (
    <Card className="p-5 gradient-card shadow-card border-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          Turmas Críticas (Hotspots)
        </h3>
        {selectedTurmaId && (
          <Badge variant="outline" className="text-xs">
            Filtrado por turma selecionada
          </Badge>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Turma</TableHead>
              <TableHead className="text-xs">Disciplina</TableHead>
              <TableHead className="text-xs">Professor Titular</TableHead>
              <TableHead className="text-xs text-center">% Subst.</TableHead>
              <TableHead className="text-xs text-right">Impacto (R$)</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhuma turma encontrada
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((item, index) => (
                <TableRow 
                  key={item.turma_id || index}
                  className="hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <TableCell className="font-medium text-sm">{item.turma}</TableCell>
                  <TableCell className="text-sm">{item.disciplina}</TableCell>
                  <TableCell className="text-sm">{item.professor_titular}</TableCell>
                  <TableCell className="text-sm text-center">
                    <span className={
                      item.percentual_substituicoes > 0.1 ? "text-destructive font-medium" :
                      item.percentual_substituicoes > 0.05 ? "text-warning font-medium" :
                      "text-success"
                    }>
                      {formatPercentage(item.percentual_substituicoes)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {formatCurrency(item.impacto_financeiro_estimado)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(item.status_risco)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
