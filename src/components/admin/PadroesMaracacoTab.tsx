import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Save, Calculator, Clock, BookOpen, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  usePadroesDisciplinas, 
  Turno, 
  PadraoDisciplinaFormData,
  getCargaDiariaSugerida,
  getCargaDiariaEstagio,
  calcularQtdDias
} from "@/hooks/usePadroesDisciplinas";

export const PadroesMaracacoTab = () => {
  const [turnoSelecionado, setTurnoSelecionado] = useState<Turno>("Matutino");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  
  const { padroes, isLoading, createPadrao, updatePadrao, deletePadrao } = usePadroesDisciplinas(turnoSelecionado);

  // Form state para novo registro
  const [newForm, setNewForm] = useState<PadraoDisciplinaFormData>({
    turno: turnoSelecionado,
    nome: "",
    carga_horaria_total: 60,
    carga_horaria_diaria: getCargaDiariaSugerida(turnoSelecionado),
  });

  // Form state para edição
  const [editForm, setEditForm] = useState<PadraoDisciplinaFormData>({
    turno: turnoSelecionado,
    nome: "",
    carga_horaria_total: 60,
    carga_horaria_diaria: 2,
  });

  // Atualizar carga diária sugerida quando mudar o turno
  useEffect(() => {
    setNewForm(prev => ({
      ...prev,
      turno: turnoSelecionado,
      carga_horaria_diaria: getCargaDiariaSugerida(turnoSelecionado),
    }));
  }, [turnoSelecionado]);

  // Aplicar regra de estágio no nome
  const handleNomeChange = (nome: string, isEdit: boolean) => {
    const cargaEstagio = getCargaDiariaEstagio(nome);
    if (cargaEstagio !== null) {
      toast.info("Disciplina 'Estágio' detectada: Carga Diária fixada em 5h");
    }
    if (isEdit) {
      setEditForm(prev => ({
        ...prev,
        nome,
        carga_horaria_diaria: cargaEstagio ?? prev.carga_horaria_diaria,
      }));
    } else {
      setNewForm(prev => ({
        ...prev,
        nome,
        carga_horaria_diaria: cargaEstagio ?? prev.carga_horaria_diaria,
      }));
    }
  };

  const handleAddNew = async () => {
    if (!newForm.nome.trim()) return;
    await createPadrao.mutateAsync(newForm);
    setNewForm({
      turno: turnoSelecionado,
      nome: "",
      carga_horaria_total: 60,
      carga_horaria_diaria: getCargaDiariaSugerida(turnoSelecionado),
    });
    setIsAdding(false);
  };

  const handleStartEdit = (padrao: typeof padroes[0]) => {
    setEditingId(padrao.id);
    setEditForm({
      turno: padrao.turno,
      nome: padrao.nome,
      carga_horaria_total: padrao.carga_horaria_total,
      carga_horaria_diaria: padrao.carga_horaria_diaria,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    await updatePadrao.mutateAsync({ id: editingId, formData: editForm });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Tem certeza que deseja remover este padrão?")) {
      await deletePadrao.mutateAsync(id);
    }
  };

  const isEstagio = (nome: string) => nome.toLowerCase().includes("estágio");

  const totalHoras = useMemo(() => 
    padroes.reduce((acc, d) => acc + d.carga_horaria_total, 0), 
    [padroes]
  );

  const totalDias = useMemo(() => 
    padroes.reduce((acc, d) => acc + calcularQtdDias(d.carga_horaria_total, d.carga_horaria_diaria), 0), 
    [padroes]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Padrões de Marcação por Disciplina
            </CardTitle>
            <CardDescription>
              Configure as cargas horárias padrão para cada disciplina por turno
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total:</span>
              <Badge variant="secondary">{totalHoras}h</Badge>
              <Badge variant="outline">{totalDias} dias</Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtro de Turno */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Selecione o Turno:</label>
          <Select value={turnoSelecionado} onValueChange={(v) => setTurnoSelecionado(v as Turno)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o turno" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Matutino">Matutino (3h/dia)</SelectItem>
              <SelectItem value="Noturno">Noturno (2h/dia)</SelectItem>
              <SelectItem value="Intermediário">Intermediário (2h/dia)</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="ml-2">
            <Calculator className="w-3 h-3 mr-1" />
            Carga sugerida: {turnoSelecionado === "Matutino" ? "3h" : "2h"}/dia
          </Badge>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="ml-auto"
            onClick={() => setIsAdding(true)}
            disabled={isAdding}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Disciplina
          </Button>
        </div>

        {/* Tabela Editável */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[300px]">Nome da Disciplina</TableHead>
                <TableHead className="w-[150px] text-center">Carga Total (h)</TableHead>
                <TableHead className="w-[150px] text-center">Carga Diária (h)</TableHead>
                <TableHead className="w-[120px] text-center">Qtd. Dias</TableHead>
                <TableHead className="w-[100px] text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {/* Linha para adicionar novo */}
                  {isAdding && (
                    <TableRow className="bg-primary/5">
                      <TableCell>
                        <Input
                          placeholder="Nome da disciplina"
                          value={newForm.nome}
                          onChange={(e) => handleNomeChange(e.target.value, false)}
                          className="border-0 bg-transparent focus-visible:ring-1"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          value={newForm.carga_horaria_total}
                          onChange={(e) => setNewForm(prev => ({ ...prev, carga_horaria_total: parseInt(e.target.value) || 0 }))}
                          className="border-0 bg-transparent focus-visible:ring-1 text-center w-20 mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Input
                            type="number"
                            value={newForm.carga_horaria_diaria}
                            onChange={(e) => setNewForm(prev => ({ ...prev, carga_horaria_diaria: parseInt(e.target.value) || 0 }))}
                            className="border-0 bg-transparent focus-visible:ring-1 text-center w-20"
                            disabled={isEstagio(newForm.nome)}
                          />
                          {isEstagio(newForm.nome) && (
                            <Badge variant="secondary" className="text-xs">Fixo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {calcularQtdDias(newForm.carga_horaria_total, newForm.carga_horaria_diaria)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={handleAddNew}
                            disabled={createPadrao.isPending}
                          >
                            {createPadrao.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                            onClick={() => setIsAdding(false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Linhas existentes */}
                  {padroes.map((padrao) => (
                    <TableRow key={padrao.id} className="hover:bg-muted/30">
                      <TableCell>
                        {editingId === padrao.id ? (
                          <Input
                            value={editForm.nome}
                            onChange={(e) => handleNomeChange(e.target.value, true)}
                            className="border-0 bg-transparent focus-visible:ring-1"
                          />
                        ) : (
                          <span className="font-medium">{padrao.nome}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === padrao.id ? (
                          <Input
                            type="number"
                            value={editForm.carga_horaria_total}
                            onChange={(e) => setEditForm(prev => ({ ...prev, carga_horaria_total: parseInt(e.target.value) || 0 }))}
                            className="border-0 bg-transparent focus-visible:ring-1 text-center w-20 mx-auto"
                          />
                        ) : (
                          <span>{padrao.carga_horaria_total}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {editingId === padrao.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              value={editForm.carga_horaria_diaria}
                              onChange={(e) => setEditForm(prev => ({ ...prev, carga_horaria_diaria: parseInt(e.target.value) || 0 }))}
                              className="border-0 bg-transparent focus-visible:ring-1 text-center w-20"
                              disabled={isEstagio(editForm.nome)}
                            />
                            {isEstagio(editForm.nome) && (
                              <Badge variant="secondary" className="text-xs">Fixo</Badge>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <span>{padrao.carga_horaria_diaria}</span>
                            {isEstagio(padrao.nome) && (
                              <Badge variant="secondary" className="text-xs">Fixo</Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {editingId === padrao.id 
                            ? calcularQtdDias(editForm.carga_horaria_total, editForm.carga_horaria_diaria)
                            : calcularQtdDias(padrao.carga_horaria_total, padrao.carga_horaria_diaria)
                          }
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          {editingId === padrao.id ? (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                                onClick={handleSaveEdit}
                                disabled={updatePadrao.isPending}
                              >
                                {updatePadrao.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-100"
                                onClick={() => setEditingId(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7"
                                onClick={() => handleStartEdit(padrao)}
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(padrao.id)}
                                disabled={deletePadrao.isPending}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {padroes.length === 0 && !isAdding && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhum padrão cadastrado para este turno.
                        <br />
                        <Button 
                          variant="link" 
                          size="sm" 
                          onClick={() => setIsAdding(true)}
                        >
                          Adicionar o primeiro
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 rounded-lg p-4 mt-4">
          <h4 className="font-medium text-sm mb-2">📋 Regras de Negócio Aplicadas:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Qtd. Dias</strong> = Carga Total ÷ Carga Diária (arredondado para cima)</li>
            <li>• <strong>Matutino:</strong> Sugere carga diária de 3h</li>
            <li>• <strong>Noturno/Intermediário:</strong> Sugere carga diária de 2h</li>
            <li>• <strong>Estágio:</strong> Força carga diária de 5h (sempre)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
