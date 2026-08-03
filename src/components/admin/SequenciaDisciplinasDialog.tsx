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
  FileDown,
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
    padroesTurno,
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
    toast.success("Cronograma salvo. Nenhum e-mail foi disparado.");
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

  const handleGerarPDF = () => {
    if (sequencia.length === 0) return;
    const turmaNome = selectedTurma?.nome || "—";
    const curso = selectedTurma?.curso || "—";
    const terminoCurso = sequencia[sequencia.length - 1]?.data_termino || "";
    const linhas = sequencia
      .map(
        (item) => `
          <tr>
            <td style="text-align:center;">${item.ordem}</td>
            <td>${item.nome}</td>
            <td>${item.nome_professor || "—"}</td>
            <td style="text-align:center;">${item.carga_horaria_total}h</td>
            <td style="text-align:center;">${item.carga_horaria_diaria}h</td>
            <td style="text-align:center;">${item.qtd_dias}</td>
            <td style="text-align:center;">${formatDateBR(item.data_inicio)}</td>
            <td style="text-align:center;">${formatDateBR(item.data_termino)}</td>
          </tr>`
      )
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Cronograma - ${turmaNome}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #222; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
    .kpis { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; font-size: 12px; }
    .kpis span { border: 1px solid #ddd; border-radius: 999px; padding: 4px 10px; background: #f7f7f7; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; }
    thead th { background: #f0f0f0; text-align: left; }
    tfoot td { font-size: 10px; color: #666; padding-top: 12px; border: none; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <h1>Cronograma da Turma — ${turmaNome}</h1>
  <div class="meta">
    <strong>Curso:</strong> ${curso} &nbsp;|&nbsp;
    <strong>Turno:</strong> ${turno || "—"} &nbsp;|&nbsp;
    <strong>Início:</strong> ${formatDateBR(dataInicio)} &nbsp;|&nbsp;
    <strong>Término:</strong> ${formatDateBR(terminoCurso)}
  </div>
  <div class="kpis">
    <span>Carga Total: ${cargaTotalCurso}h</span>
    <span>Total de Dias: ${totalDiasCurso} dias úteis</span>
    <span>${sequencia.length} disciplina(s)</span>
  </div>
  <table>
    <thead>
      <tr>
        <th style="text-align:center;width:50px;">Ordem</th>
        <th>Disciplina</th>
        <th style="width:160px;">Professor</th>
        <th style="text-align:center;width:70px;">Carga</th>
        <th style="text-align:center;width:60px;">Diária</th>
        <th style="text-align:center;width:50px;">Dias</th>
        <th style="text-align:center;width:90px;">Início</th>
        <th style="text-align:center;width:90px;">Término</th>
      </tr>
    </thead>
    <tbody>${linhas}</tbody>
    <tfoot>
      <tr><td colspan="8">Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td></tr>
    </tfoot>
  </table>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
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
                          <SelectTrigger className="h-8 text-xs" title={item.nome}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-[300px]">
                            {(() => {
                              const names = new Set<string>();
                              padroesTurno.forEach((p) => names.add(p.nome));
                              // Ensure current item is selectable even if not in padroes
                              names.add(item.nome);
                              return Array.from(names)
                                .sort((a, b) => a.localeCompare(b, "pt-BR"))
                                .map((nome) => (
                                  <SelectItem key={nome} value={nome} title={nome}>
                                    {nome}
                                  </SelectItem>
                                ));
                            })()}
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
            variant="outline"
            onClick={handleGerarPDF}
            disabled={sequencia.length === 0}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            Gerar PDF
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
              O cronograma <strong>já foi salvo</strong>. Deseja também gerar e enviar os contratos atualizados
              por e-mail para {profsVinculados} professor(es) vinculado(s) às disciplinas?
              <br /><br />
              Se escolher "Não enviar agora", as alterações permanecem salvas e nenhum
              e-mail é disparado.
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
