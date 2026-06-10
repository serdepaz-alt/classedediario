import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Loader2,
  Save,
  Clock,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSequenciaDisciplinas } from "@/hooks/useSequenciaDisciplinas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTurmaId?: string | null;
}

export const SequenciaDisciplinasDialog = ({ open, onOpenChange, initialTurmaId }: Props) => {
  const {
    turmas,
    professores,
    selectedTurmaId,
    selectedTurma,
    turno,
    sequencia,
    dataInicio,
    isLoadingTurmas,
    isLoadingPadroes,
    isSaving,
    cargaTotalCurso,
    totalDiasCurso,
    fetchTurmas,
    loadPadroes,
    loadExistingSequencia,
    handleSetDataInicio,
    moveItem,
    setProfessor,
    setItemDataInicio,
    setItemDataTermino,
    swapDisciplina,
    salvar,
    gerarContratos,
    contarProfessoresVinculados,
    reset,
  } = useSequenciaDisciplinas();

  useEffect(() => {
    if (open) {
      reset();
      fetchTurmas();
    }
  }, [open, fetchTurmas, reset]);

  // When turmas are loaded and we have an initialTurmaId, auto-load that turma
  useEffect(() => {
    if (open && initialTurmaId && turmas.length > 0 && !selectedTurmaId) {
      loadExistingSequencia(initialTurmaId);
    }
  }, [open, initialTurmaId, turmas, selectedTurmaId, loadExistingSequencia]);

  const [confirmEmailOpen, setConfirmEmailOpen] = useState(false);
  const [profsVinculados, setProfsVinculados] = useState(0);

  const handleSave = async () => {
    const success = await salvar();
    if (!success) return;
    const count = contarProfessoresVinculados();
    if (count > 0) {
      setProfsVinculados(count);
      setConfirmEmailOpen(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmSendEmails = async () => {
    setConfirmEmailOpen(false);
    await gerarContratos();
    onOpenChange(false);
  };

  const handleSkipEmails = () => {
    setConfirmEmailOpen(false);
    onOpenChange(false);
  };

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return "—";
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Cadastro de Sequência de Disciplinas por Turma
          </DialogTitle>
          <DialogDescription>
            Selecione uma turma, defina a data de início e o sistema calculará
            automaticamente o cronograma completo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Turma Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Selecione a Turma</Label>
              {isLoadingTurmas ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando turmas...
                </div>
              ) : (
                <Select
                  value={selectedTurmaId}
                  onValueChange={(id) => loadPadroes(id)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma turma" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {turmas.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedTurma && (
              <div className="flex items-end gap-3">
                <Badge variant="secondary" className="h-8 px-3">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Turno: {turno}
                </Badge>
                {selectedTurma.curso && (
                  <Badge variant="outline" className="h-8 px-3">
                    Curso: {selectedTurma.curso}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Start Date */}
          {selectedTurmaId && sequencia.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="data_inicio_seq" className="flex items-center gap-2">
                📅 Data de Início da Turma
              </Label>
              <Input
                id="data_inicio_seq"
                type="date"
                className="w-[200px]"
                value={dataInicio}
                onChange={(e) => handleSetDataInicio(e.target.value)}
              />
            </div>
          )}

          {/* Summary KPIs */}
          {sequencia.length > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="secondary" className="h-8 px-3">
                <Clock className="w-3 h-3 mr-1" />
                Carga Total: {cargaTotalCurso}h
              </Badge>
              <Badge variant="outline" className="h-8 px-3">
                Total de Dias: {totalDiasCurso} dias úteis
              </Badge>
              <Badge variant="outline" className="h-8 px-3">
                {sequencia.length} disciplina(s)
              </Badge>
              {dataInicio && sequencia.length > 0 && sequencia[sequencia.length - 1].data_termino && (
                <Badge className="h-8 px-3 bg-primary/10 text-primary border-primary/20">
                  Término: {formatDateBR(sequencia[sequencia.length - 1].data_termino)}
                </Badge>
              )}
            </div>
          )}

          {/* Step 3: Discipline Sequence Table */}
          {isLoadingPadroes ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sequencia.length > 0 ? (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[60px] text-center">Ordem</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead className="w-[160px]">Professor</TableHead>
                    <TableHead className="text-center w-[100px]">Carga (h)</TableHead>
                    <TableHead className="text-center w-[80px]">Diária</TableHead>
                    <TableHead className="text-center w-[80px]">Dias</TableHead>
                    <TableHead className="text-center w-[110px]">Início</TableHead>
                    <TableHead className="text-center w-[110px]">Término</TableHead>
                    <TableHead className="text-center w-[80px]">Mover</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sequencia.map((item, idx) => (
                    <TableRow key={`${item.nome}-${idx}`} className="hover:bg-muted/30">
                      <TableCell className="text-center font-mono font-bold text-muted-foreground">
                        {item.ordem}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Select
                          value={item.nome}
                          onValueChange={(val) => swapDisciplina(idx, val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-[300px]">
                            {sequencia.map((s) => (
                              <SelectItem key={s.nome} value={s.nome}>
                                {s.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.nome_professor || "sem-professor"}
                          onValueChange={(val) => setProfessor(idx, val === "sem-professor" ? "" : val)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecionar" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="sem-professor">— Sem professor —</SelectItem>
                            {professores.map((p) => (
                              <SelectItem key={p.id} value={p.nome}>
                                {p.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">{item.carga_horaria_total}h</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.carga_horaria_diaria}h
                          {item.nome.toLowerCase().includes("estágio") && (
                            <Badge variant="secondary" className="text-[10px] px-1">Fixo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {item.qtd_dias}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="date"
                          value={item.data_inicio || ""}
                          onChange={(e) => setItemDataInicio(idx, e.target.value)}
                          className="h-8 text-xs px-1 w-[120px] mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="date"
                          value={item.data_termino || ""}
                          onChange={(e) => setItemDataTermino(idx, e.target.value)}
                          className="h-8 text-xs px-1 w-[120px] mx-auto"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={idx === 0}
                            onClick={() => moveItem(idx, "up")}
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            disabled={idx === sequencia.length - 1}
                            onClick={() => moveItem(idx, "down")}
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : selectedTurmaId ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p>Nenhum padrão de disciplina cadastrado para o turno <strong>{turno}</strong>.</p>
              <p className="text-sm mt-1">Cadastre os padrões na aba "Padrões de Marcação" antes de gerar o cronograma.</p>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || sequencia.length === 0 || !dataInicio}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar Cronograma
          </Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={confirmEmailOpen} onOpenChange={setConfirmEmailOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disparar e-mails aos professores?</AlertDialogTitle>
            <AlertDialogDescription>
              O cronograma foi salvo. Deseja gerar e enviar os contratos atualizados
              por e-mail para {profsVinculados} professor(es) vinculado(s) às disciplinas?
              <br /><br />
              Ao confirmar, o fluxo segue normalmente: os contratos são gerados e enviados
              para os e-mails cadastrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipEmails}>Não enviar agora</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSendEmails}>
              Sim, disparar e-mails
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
};
