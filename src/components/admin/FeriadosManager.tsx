import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarOff, Plus, Trash2, Loader2, Zap, Download, Pencil, CalendarDays, List } from "lucide-react";
import { useFeriados, FeriadoFormData } from "@/hooks/useFeriados";
import { useAutoCascade } from "@/hooks/useAutoCascade";
import { CascadePreviewDialog } from "@/components/cronograma/CascadePreviewDialog";
import { FeriadoCalendarView } from "./FeriadoCalendarView";
import { getFeriadosNacionais } from "@/lib/feriadosNacionais";
import { format, parseISO, eachDayOfInterval, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const FeriadosManager = () => {
  const { feriados, isLoading, createFeriado, updateFeriado, deleteFeriado } = useFeriados();
  const {
    cascadeChanges,
    isCalculating,
    isApplying,
    showPreview,
    setShowPreview,
    calculateCascade,
    applyCascade,
  } = useAutoCascade();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importYear, setImportYear] = useState(new Date().getFullYear().toString());
  const [isImporting, setIsImporting] = useState(false);
  const [editingFeriado, setEditingFeriado] = useState<string | null>(null);
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [formData, setFormData] = useState<FeriadoFormData & { data_fim?: string }>({
    data: "",
    nome: "",
    tipo: "feriado",
    data_fim: "",
  });

  const resetForm = () => {
    setFormData({ data: "", nome: "", tipo: "feriado", data_fim: "" });
    setEditingFeriado(null);
    setIsRangeMode(false);
  };

  const handleSave = async () => {
    if (!formData.data || !formData.nome) return;

    if (isRangeMode && formData.data_fim && formData.data_fim > formData.data) {
      // Create individual entries for each day in the range (skip weekends)
      const days = eachDayOfInterval({
        start: parseISO(formData.data),
        end: parseISO(formData.data_fim),
      }).filter((d) => !isWeekend(d));

      const daysFormatted = days.map((d) => format(d, "yyyy-MM-dd"));
      for (const dayStr of daysFormatted) {
        await createFeriado.mutateAsync({
          data: dayStr,
          nome: formData.nome,
          tipo: formData.tipo,
        });
      }
      setIsDialogOpen(false);
      // Trigger cascade for entire range
      if (daysFormatted.length > 0) {
        await calculateCascade(daysFormatted);
      }
      resetForm();
      return;
    }

    if (editingFeriado) {
      await updateFeriado.mutateAsync({ id: editingFeriado, ...formData });
      setIsDialogOpen(false);
      await calculateCascade(formData.data);
      resetForm();
      return;
    }

    await createFeriado.mutateAsync(formData);
    setIsDialogOpen(false);
    await calculateCascade(formData.data);
    resetForm();
  };

  const handleEdit = (feriado: any) => {
    setEditingFeriado(feriado.id);
    setFormData({ data: feriado.data, nome: feriado.nome, tipo: feriado.tipo || "feriado" });
    setIsRangeMode(false);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este feriado?")) {
      await deleteFeriado.mutateAsync(id);
      toast.info("Aulas previamente realocadas por este feriado não voltam automaticamente para a data original.", { duration: 6000 });
    }
  };

  const handleImportNacionais = async () => {
    const ano = parseInt(importYear);
    if (isNaN(ano) || ano < 2020 || ano > 2050) {
      toast.error("Informe um ano válido (2020-2050)");
      return;
    }

    setIsImporting(true);
    try {
      const nacionais = getFeriadosNacionais(ano);
      const existingDates = new Set(feriados.map((f) => f.data));
      const novos = nacionais.filter((f) => !existingDates.has(f.data));

      if (novos.length === 0) {
        toast.info(`Todos os feriados nacionais de ${ano} já estão cadastrados.`);
        setIsImportDialogOpen(false);
        setIsImporting(false);
        return;
      }

      const datesToCascade = [];
      for (const f of novos) {
        await createFeriado.mutateAsync(f);
        datesToCascade.push(f.data);
      }

      toast.success(`${novos.length} feriado(s) nacional(is) de ${ano} importados!`);
      setIsImportDialogOpen(false);
      
      if (datesToCascade.length > 0) {
        await calculateCascade(datesToCascade);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao importar feriados nacionais");
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy (EEEE)", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const tipoLabel = (tipo: string | null) => {
    switch (tipo) {
      case "feriado": return "Feriado";
      case "recesso": return "Recesso";
      case "ponto_facultativo": return "Ponto Facultativo";
      default: return "Feriado";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-destructive" />
                Feriados e Recessos
              </CardTitle>
              <CardDescription>
                Gerencie feriados, recessos e pontos facultativos
                <Badge variant="outline" className="ml-2 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto-Cascade
                </Badge>
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
                <Download className="w-4 h-4" />
                Importar Nacionais
              </Button>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Feriado
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : feriados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <CalendarOff className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum feriado cadastrado</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Importe os feriados nacionais ou cadastre manualmente.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                  <Download className="w-4 h-4 mr-2" />
                  Importar Nacionais
                </Button>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Cadastrar Feriado
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="lista">
              <TabsList className="mb-4">
                <TabsTrigger value="lista" className="gap-1">
                  <List className="w-3.5 h-3.5" /> Lista
                </TabsTrigger>
                <TabsTrigger value="calendario" className="gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Calendário
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lista">
                <div className="rounded-md border max-h-[360px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-center w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feriados.map((feriado) => (
                        <TableRow key={feriado.id}>
                          <TableCell className="font-medium">{formatDate(feriado.data)}</TableCell>
                          <TableCell>{feriado.nome}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{tipoLabel(feriado.tipo)}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => handleEdit(feriado)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() => handleDelete(feriado.id)}
                                disabled={deleteFeriado.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="calendario">
                <FeriadoCalendarView feriados={feriados} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Feriado Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsDialogOpen(open); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFeriado ? "Editar Feriado" : "Novo Feriado"}</DialogTitle>
            <DialogDescription>
              {editingFeriado
                ? "Atualize os dados do feriado."
                : "Ao salvar, o sistema verificará automaticamente se há aulas agendadas e proporá a realocação."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feriado-nome">Nome</Label>
              <Input
                id="feriado-nome"
                placeholder="Ex: Dia da Independência"
                value={formData.nome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            {!editingFeriado && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="range-mode"
                  checked={isRangeMode}
                  onChange={(e) => setIsRangeMode(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="range-mode" className="text-sm cursor-pointer">
                  Cadastrar faixa de datas (recesso)
                </Label>
              </div>
            )}

            <div className={`grid gap-4 ${isRangeMode ? "grid-cols-2" : "grid-cols-1"}`}>
              <div className="space-y-2">
                <Label htmlFor="feriado-data">{isRangeMode ? "Data Início" : "Data"}</Label>
                <Input
                  id="feriado-data"
                  type="date"
                  value={formData.data}
                  onChange={(e) => setFormData((prev) => ({ ...prev, data: e.target.value }))}
                />
              </div>
              {isRangeMode && (
                <div className="space-y-2">
                  <Label htmlFor="feriado-data-fim">Data Fim</Label>
                  <Input
                    id="feriado-data-fim"
                    type="date"
                    value={formData.data_fim || ""}
                    min={formData.data}
                    onChange={(e) => setFormData((prev) => ({ ...prev, data_fim: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="feriado-tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, tipo: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feriado">Feriado</SelectItem>
                  <SelectItem value="recesso">Recesso</SelectItem>
                  <SelectItem value="ponto_facultativo">Ponto Facultativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { resetForm(); setIsDialogOpen(false); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={createFeriado.isPending || updateFeriado?.isPending || isCalculating}
            >
              {(createFeriado.isPending || updateFeriado?.isPending || isCalculating) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {editingFeriado ? "Salvar Alterações" : "Salvar e Verificar Aulas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Feriados Nacionais</DialogTitle>
            <DialogDescription>
              Importe automaticamente os feriados nacionais brasileiros (fixos e móveis como Carnaval, Páscoa, Corpus Christi).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={importYear} onValueChange={setImportYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 1 + i).map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Serão importados:</p>
              <p>• Confraternização, Carnaval, Sexta-Santa, Tiradentes, Trabalho</p>
              <p>• Corpus Christi, Independência, N. Sra. Aparecida, Finados</p>
              <p>• Proclamação da República, Consciência Negra, Natal e outros</p>
              <p className="mt-2 italic">Feriados já cadastrados não serão duplicados.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImportNacionais} disabled={isImporting}>
              {isImporting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Importar Feriados de {importYear}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cascade Preview Dialog */}
      <CascadePreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        changes={cascadeChanges}
        isApplying={isApplying}
        onConfirm={applyCascade}
      />
    </>
  );
};
