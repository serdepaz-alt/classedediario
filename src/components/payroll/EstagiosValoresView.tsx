import { useState } from "react";
import { usePayroll, ValorEstagio } from "@/hooks/usePayroll";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Building2 } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const EstagiosValoresView = () => {
  const { valoresEstagio, addValorEstagio, deleteValorEstagio } = usePayroll();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ unidade_hospitalar: "", valor_base: "", dias_padrao: "1", valor_vt: "", valor_va: "", ativo: true });

  const custoPreview = () => {
    const vb = parseFloat(form.valor_base) || 0;
    const d = parseInt(form.dias_padrao) || 0;
    const vt = parseFloat(form.valor_vt) || 0;
    const va = parseFloat(form.valor_va) || 0;
    return vb + (d * vt) + (d * va);
  };

  const handleSave = () => {
    addValorEstagio.mutate({
      unidade_hospitalar: form.unidade_hospitalar,
      valor_base: parseFloat(form.valor_base) || 0,
      dias_padrao: parseInt(form.dias_padrao) || 1,
      valor_vt: parseFloat(form.valor_vt) || 0,
      valor_va: parseFloat(form.valor_va) || 0,
      ativo: true,
    });
    setShowAdd(false);
    setForm({ unidade_hospitalar: "", valor_base: "", dias_padrao: "1", valor_vt: "", valor_va: "", ativo: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <h3 className="font-semibold">Valores de Estágio por Unidade</h3>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-1" /> Novo Estágio</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Unidade Hospitalar</TableHead>
                <TableHead className="text-right">Valor Base</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead className="text-right">VT/dia</TableHead>
                <TableHead className="text-right">VA/dia</TableHead>
                <TableHead className="text-right font-semibold">Custo Total</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {valoresEstagio.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum estágio cadastrado</TableCell></TableRow>
              ) : valoresEstagio.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.unidade_hospitalar}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(Number(v.valor_base))}</TableCell>
                  <TableCell className="text-right">{v.dias_padrao}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(Number(v.valor_vt))}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(Number(v.valor_va))}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-primary">{fmt(Number(v.custo_total_calculado))}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteValorEstagio.mutate({ id: v.id, anterior: v })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Valor de Estágio</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Unidade Hospitalar</Label><Input value={form.unidade_hospitalar} onChange={(e) => setForm({ ...form, unidade_hospitalar: e.target.value })} placeholder="Ex: Hospital Santa Maria" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Valor Base (R$)</Label><Input type="number" step="0.01" value={form.valor_base} onChange={(e) => setForm({ ...form, valor_base: e.target.value })} /></div>
              <div><Label>Dias Padrão</Label><Input type="number" value={form.dias_padrao} onChange={(e) => setForm({ ...form, dias_padrao: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>VT/dia (R$)</Label><Input type="number" step="0.01" value={form.valor_vt} onChange={(e) => setForm({ ...form, valor_vt: e.target.value })} /></div>
              <div><Label>VA/dia (R$)</Label><Input type="number" step="0.01" value={form.valor_va} onChange={(e) => setForm({ ...form, valor_va: e.target.value })} /></div>
            </div>
            <Card className="bg-muted/50 border-dashed"><CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Custo Total Calculado</p>
              <p className="text-lg font-bold text-primary">{fmt(custoPreview())}</p>
            </CardContent></Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.unidade_hospitalar}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
