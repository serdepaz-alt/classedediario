import { useState } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Shield, Lock, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

export const AuditoriaDirecaoView = () => {
  const { auditTrail, valoresHora, folhas, fecharFolha } = usePayroll();
  const [showFechar, setShowFechar] = useState(false);
  const [mesFechamento, setMesFechamento] = useState("");
  const [filterTabela, setFilterTabela] = useState<string>("all");

  const filteredAudit = filterTabela === "all" ? auditTrail : auditTrail.filter((a) => a.tabela_afetada === filterTabela);

  // Detect divergences: values that differ from official table
  const divergencias = auditTrail.filter((a) => a.acao.includes("Atualiz") && a.tabela_afetada === "tabela_valores_hora");

  const handleFechar = () => {
    if (!mesFechamento) return;
    fecharFolha.mutate(mesFechamento + "-01");
    setShowFechar(false);
    setMesFechamento("");
  };

  const mesAtual = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Director Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Painel de Auditoria — Direção</h3>
        </div>
        <Button size="sm" onClick={() => setShowFechar(true)} className="gap-1.5">
          <Lock className="w-4 h-4" /> Validar e Fechar Folha
        </Button>
      </div>

      {/* Divergence Report */}
      {divergencias.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Relatório de Discrepâncias ({divergencias.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Valor Anterior</TableHead>
                  <TableHead>Novo Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divergencias.slice(0, 10).map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs font-mono">{new Date(d.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-sm">{d.usuario_responsavel}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{d.acao}</Badge></TableCell>
                    <TableCell className="text-xs font-mono text-destructive">{JSON.stringify(d.valor_anterior)}</TableCell>
                    <TableCell className="text-xs font-mono text-primary">{JSON.stringify(d.valor_novo)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Folhas fechadas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {folhas.slice(0, 6).map((f) => (
          <Card key={f.id} className="border-none shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Folha</p>
                <p className="font-medium">{new Date(f.mes_referencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</p>
              </div>
              <Badge variant={f.status === "fechada" ? "default" : "secondary"} className="gap-1">
                {f.status === "fechada" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {f.status === "fechada" ? "Fechada" : "Aberta"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Audit Trail */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Timeline de Governança
          </CardTitle>
          <Select value={filterTabela} onValueChange={setFilterTabela}>
            <SelectTrigger className="w-[180px] h-8"><SelectValue placeholder="Filtrar tabela" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="tabela_valores_hora">Valores Hora</SelectItem>
              <SelectItem value="valores_estagio">Estágios</SelectItem>
              <SelectItem value="folha_fechamento">Fechamento</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-40">Timestamp</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tabela</TableHead>
                <TableHead>Anterior</TableHead>
                <TableHead>Novo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudit.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum registro de auditoria</TableCell></TableRow>
              ) : filteredAudit.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs font-mono">{new Date(a.created_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell className="text-sm">{a.usuario_responsavel}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{a.acao}</Badge></TableCell>
                  <TableCell className="text-xs">{a.tabela_afetada}</TableCell>
                  <TableCell className="text-xs font-mono max-w-32 truncate">{a.valor_anterior ? JSON.stringify(a.valor_anterior) : "—"}</TableCell>
                  <TableCell className="text-xs font-mono max-w-32 truncate">{a.valor_novo ? JSON.stringify(a.valor_novo) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Fechar Folha Dialog */}
      <Dialog open={showFechar} onOpenChange={setShowFechar}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Fechar Folha do Mês</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Ao fechar, os cálculos serão congelados e nenhuma edição retroativa será permitida sem autorização da Direção.</p>
            <Input type="month" value={mesFechamento} onChange={(e) => setMesFechamento(e.target.value)} max={mesAtual} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFechar(false)}>Cancelar</Button>
            <Button onClick={handleFechar} disabled={!mesFechamento} variant="destructive" className="gap-1.5">
              <Lock className="w-4 h-4" /> Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
