import { useState } from "react";
import { usePayroll, TabelaValorHora } from "@/hooks/usePayroll";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Search, Filter, DollarSign } from "lucide-react";

const CATEGORIAS = ["Técnico", "Profissionalizante", "Capacitação"];
const TURNOS = ["Diurno", "Noturno", "Sábado"];

const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const TabelaValoresView = () => {
  const { valoresHora, addValorHora, updateValorHora, deleteValorHora, bulkUpdateValores } = usePayroll();
  const [search, setSearch] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterTurno, setFilterTurno] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<TabelaValorHora | null>(null);
  const [bulkValue, setBulkValue] = useState("");
  const [form, setForm] = useState({ categoria: "Técnico", turno: "Diurno", valor_hora: "", descricao: "", ativo: true });

  const filtered = valoresHora.filter((v) => {
    if (filterCategoria !== "all" && v.categoria !== filterCategoria) return false;
    if (filterTurno !== "all" && v.turno !== filterTurno) return false;
    if (search && !v.descricao?.toLowerCase().includes(search.toLowerCase()) && !v.categoria.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((v) => v.id)));
    }
  };

  const handleSave = () => {
    const valor = parseFloat(form.valor_hora);
    if (isNaN(valor)) return;
    if (editItem) {
      updateValorHora.mutate({ id: editItem.id, categoria: form.categoria, turno: form.turno, valor_hora: valor, descricao: form.descricao || null, ativo: form.ativo, anterior: editItem });
    } else {
      addValorHora.mutate({ categoria: form.categoria, turno: form.turno, valor_hora: valor, descricao: form.descricao || null, ativo: form.ativo });
    }
    setShowAdd(false);
    setEditItem(null);
    setForm({ categoria: "Técnico", turno: "Diurno", valor_hora: "", descricao: "", ativo: true });
  };

  const handleBulkUpdate = () => {
    const valor = parseFloat(bulkValue);
    if (isNaN(valor) || selected.size === 0) return;
    bulkUpdateValores.mutate({ ids: Array.from(selected), campo: "valor_hora", valor });
    setSelected(new Set());
    setBulkValue("");
  };

  const openEdit = (item: TabelaValorHora) => {
    setEditItem(item);
    setForm({ categoria: item.categoria, turno: item.turno, valor_hora: String(item.valor_hora), descricao: item.descricao || "", ativo: item.ativo });
    setShowAdd(true);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 bg-card" />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-[160px] h-9 bg-card"><Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTurno} onValueChange={setFilterTurno}>
          <SelectTrigger className="w-[140px] h-9 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Turnos</SelectItem>
            {TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setEditItem(null); setForm({ categoria: "Técnico", turno: "Diurno", valor_hora: "", descricao: "", ativo: true }); setShowAdd(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Novo Valor
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TURNOS.map((turno) => {
          const items = valoresHora.filter((v) => v.turno === turno && v.ativo);
          const avg = items.length ? items.reduce((s, v) => s + Number(v.valor_hora), 0) / items.length : 0;
          return (
            <Card key={turno} className="border-none shadow-sm">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{turno}</p>
                <p className="text-xl font-semibold mt-1">{formatCurrency(avg)}</p>
                <p className="text-xs text-muted-foreground">{items.length} registro(s)</p>
              </CardContent>
            </Card>
          );
        })}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Geral</p>
            <p className="text-xl font-semibold mt-1">{valoresHora.filter((v) => v.ativo).length}</p>
            <p className="text-xs text-muted-foreground">valores ativos</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead className="text-right">Valor/Hora</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum valor cadastrado. Clique em "Novo Valor" para começar.</TableCell></TableRow>
              ) : filtered.map((v) => (
                <TableRow key={v.id} className={selected.has(v.id) ? "bg-primary/5" : ""}>
                  <TableCell><Checkbox checked={selected.has(v.id)} onCheckedChange={() => toggleSelect(v.id)} /></TableCell>
                  <TableCell className="font-medium">{v.categoria}</TableCell>
                  <TableCell>
                    <Badge variant={v.turno === "Noturno" ? "secondary" : v.turno === "Sábado" ? "outline" : "default"} className="text-xs">
                      {v.turno}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">{formatCurrency(Number(v.valor_hora))}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{v.descricao || "—"}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={v.ativo ? "default" : "secondary"} className="text-xs">{v.ativo ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(v)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteValorHora.mutate({ id: v.id, anterior: v })}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Floating Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border shadow-elevated rounded-xl px-5 py-3">
          <span className="text-sm font-medium">{selected.size} selecionado(s)</span>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <Input type="number" placeholder="Novo valor/hora" value={bulkValue} onChange={(e) => setBulkValue(e.target.value)} className="w-36 h-8 text-sm" />
            <Button size="sm" onClick={handleBulkUpdate} disabled={!bulkValue}>Aplicar</Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancelar</Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Valor" : "Novo Valor Hora-Aula"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Turno</Label>
                <Select value={form.turno} onValueChange={(v) => setForm({ ...form, turno: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Valor/Hora (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_hora} onChange={(e) => setForm({ ...form, valor_hora: e.target.value })} placeholder="50.00" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Enfermagem - Módulo I" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.valor_hora}>{editItem ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
