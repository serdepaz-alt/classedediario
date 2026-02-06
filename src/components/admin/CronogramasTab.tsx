import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Trash2, Edit2, Loader2, CalendarRange } from "lucide-react";
import { usePeriodosLetivos, PeriodoLetivoFormData } from "@/hooks/usePeriodosLetivos";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const CronogramasTab = () => {
  const { periodos, isLoading, createPeriodo, updatePeriodo, deletePeriodo } = usePeriodosLetivos();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<PeriodoLetivoFormData>({
    nome: "",
    data_inicio: "",
    data_fim: "",
    ano_letivo: new Date().getFullYear(),
    ativo: true,
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      data_inicio: "",
      data_fim: "",
      ano_letivo: new Date().getFullYear(),
      ativo: true,
    });
    setEditingId(null);
  };

  const handleOpenDialog = (periodo?: typeof periodos[0]) => {
    if (periodo) {
      setEditingId(periodo.id);
      setFormData({
        nome: periodo.nome,
        data_inicio: periodo.data_inicio,
        data_fim: periodo.data_fim,
        ano_letivo: periodo.ano_letivo,
        ativo: periodo.ativo,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.data_inicio || !formData.data_fim) return;

    if (editingId) {
      await updatePeriodo.mutateAsync({ id: editingId, formData });
    } else {
      await createPeriodo.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este período letivo?")) {
      await deletePeriodo.mutateAsync(id);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Gestão de Cronogramas
            </CardTitle>
            <CardDescription>
              Configure os períodos letivos para geração automática de cronogramas
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Período
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : periodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <CalendarRange className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum período cadastrado</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Cadastre períodos letivos para poder gerar cronogramas de aulas automaticamente.
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Período
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ano Letivo</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {periodos.map((periodo) => (
                  <TableRow key={periodo.id}>
                    <TableCell className="font-medium">{periodo.nome}</TableCell>
                    <TableCell>{periodo.ano_letivo}</TableCell>
                    <TableCell>{formatDate(periodo.data_inicio)}</TableCell>
                    <TableCell>{formatDate(periodo.data_fim)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={periodo.ativo ? "default" : "secondary"}>
                        {periodo.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7"
                          onClick={() => handleOpenDialog(periodo)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(periodo.id)}
                          disabled={deletePeriodo.isPending}
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

        {/* Dialog para adicionar/editar */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Período Letivo" : "Novo Período Letivo"}
              </DialogTitle>
              <DialogDescription>
                Configure as datas do período letivo para geração de cronogramas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Período</Label>
                <Input
                  id="nome"
                  placeholder="Ex: 1º Semestre 2025"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ano_letivo">Ano Letivo</Label>
                <Input
                  id="ano_letivo"
                  type="number"
                  value={formData.ano_letivo}
                  onChange={(e) => setFormData(prev => ({ ...prev, ano_letivo: parseInt(e.target.value) || new Date().getFullYear() }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="data_inicio">Data de Início</Label>
                  <Input
                    id="data_inicio"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_fim">Data de Término</Label>
                  <Input
                    id="data_fim"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="ativo"
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
                />
                <Label htmlFor="ativo">Período Ativo</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={createPeriodo.isPending || updatePeriodo.isPending}
              >
                {(createPeriodo.isPending || updatePeriodo.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
