import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarOff, Plus, Trash2, Loader2, Zap } from "lucide-react";
import { useFeriados, FeriadoFormData } from "@/hooks/useFeriados";
import { useAutoCascade } from "@/hooks/useAutoCascade";
import { CascadePreviewDialog } from "@/components/cronograma/CascadePreviewDialog";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const FeriadosManager = () => {
  const { feriados, isLoading, createFeriado, deleteFeriado } = useFeriados();
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
  const [formData, setFormData] = useState<FeriadoFormData>({
    data: "",
    nome: "",
    tipo: "feriado",
  });

  const resetForm = () => setFormData({ data: "", nome: "", tipo: "feriado" });

  const handleSave = async () => {
    if (!formData.data || !formData.nome) return;
    await createFeriado.mutateAsync(formData);
    setIsDialogOpen(false);

    // Trigger Auto-Cascade automatically
    await calculateCascade(formData.data);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este feriado?")) {
      await deleteFeriado.mutateAsync(id);
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarOff className="w-5 h-5 text-destructive" />
                Feriados e Recessos
              </CardTitle>
              <CardDescription>
                Ao cadastrar um feriado, o sistema realoca automaticamente as aulas afetadas
                <Badge variant="outline" className="ml-2 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Auto-Cascade
                </Badge>
              </CardDescription>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Novo Feriado
            </Button>
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
                Cadastre feriados para que o sistema realoque automaticamente as aulas programadas.
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Feriado
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-center w-20">Ações</TableHead>
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
                        <div className="flex justify-center">
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
          )}

          {/* Add Feriado Dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Feriado</DialogTitle>
                <DialogDescription>
                  Ao salvar, o sistema verificará automaticamente se há aulas agendadas nesta data e proporá a realocação.
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
                <div className="space-y-2">
                  <Label htmlFor="feriado-data">Data</Label>
                  <Input
                    id="feriado-data"
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData((prev) => ({ ...prev, data: e.target.value }))}
                  />
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
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createFeriado.isPending || isCalculating}
                >
                  {(createFeriado.isPending || isCalculating) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Salvar e Verificar Aulas
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

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
