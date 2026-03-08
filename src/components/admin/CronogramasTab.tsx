import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Calendar, Loader2, CalendarRange, ListOrdered, ChevronDown, ChevronUp, FileDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeriadosManager } from "./FeriadosManager";
import { SequenciaDisciplinasDialog } from "./SequenciaDisciplinasDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isWithinInterval, differenceInBusinessDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DisciplinaRow {
  id: string;
  nome: string;
  turma_id: string | null;
  turno: string;
  curso: string;
  carga_horaria_total: number | null;
  carga_horaria_diaria: number;
  dias_uteis: number | null;
  data_inicio: string;
  data_termino: string;
  nome_professor: string | null;
  turma_nome?: string;
  turma_periodo?: string | null;
  turma_horario?: string | null;
  turma_data_inicio?: string | null;
}

const TURNOS = ["Matutino", "Vespertino", "Noturno", "Intermediário"];
const CURSOS = ["Técnico em Enfermagem"];

export const CronogramasTab = () => {
  const { user } = useAuth();
  const [sequenciaDialogOpen, setSequenciaDialogOpen] = useState(false);
  const [editTurmaId, setEditTurmaId] = useState<string | null>(null);
  const [filtroTurno, setFiltroTurno] = useState("Matutino");
  const [filtroCurso, setFiltroCurso] = useState("Técnico em Enfermagem");
  const [disciplinas, setDisciplinas] = useState<DisciplinaRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedTurmas, setExpandedTurmas] = useState<Record<string, boolean>>({});

  const fetchDisciplinas = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("disciplinas")
        .select("*, turmas!disciplinas_turma_id_fkey(nome, periodo, horario, data_inicio)")
        .eq("user_id", user.id)
        .eq("turno", filtroTurno)
        .eq("curso", filtroCurso)
        .order("data_inicio", { ascending: true });

      if (error) throw error;

      const rows: DisciplinaRow[] = (data || []).map((d: any) => ({
        ...d,
        turma_nome: d.turmas?.nome || "—",
        turma_periodo: d.turmas?.periodo || null,
        turma_horario: d.turmas?.horario || null,
        turma_data_inicio: d.turmas?.data_inicio || null,
      }));
      setDisciplinas(rows);
    } catch (err) {
      console.error("Erro ao carregar disciplinas:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filtroTurno, filtroCurso]);

  useEffect(() => {
    fetchDisciplinas();
  }, [fetchDisciplinas]);

  const handleSequenciaSaved = () => {
    setSequenciaDialogOpen(false);
    setEditTurmaId(null);
    fetchDisciplinas();
  };

  const formatDateBR = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  // Group by turma
  const turmaGroups = disciplinas.reduce<Record<string, DisciplinaRow[]>>((acc, d) => {
    const key = d.turma_id || "sem-turma";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  const today = format(new Date(), "yyyy-MM-dd");

  const getVisibleDisciplinas = (items: DisciplinaRow[], turmaId: string) => {
    // If expanded, show all
    if (expandedTurmas[turmaId]) {
      const currentIdx = items.findIndex((d) => {
        try {
          return isWithinInterval(new Date(), {
            start: parseISO(d.data_inicio),
            end: parseISO(d.data_termino),
          });
        } catch { return false; }
      });
      return { visible: items, currentIdx, startIdx: 0 };
    }

    // Find current discipline
    let currentIdx = items.findIndex((d) => {
      try {
        return isWithinInterval(new Date(), {
          start: parseISO(d.data_inicio),
          end: parseISO(d.data_termino),
        });
      } catch { return false; }
    });

    const allFuture = items.every((d) => d.data_inicio > today);
    if (allFuture) {
      return { visible: items.slice(0, 3), currentIdx: -1, startIdx: 0 };
    }

    if (currentIdx === -1) {
      currentIdx = items.findIndex((d) => d.data_inicio > today);
    }
    if (currentIdx === -1) {
      currentIdx = Math.max(0, items.length - 2);
    }

    const startIdx = Math.max(0, currentIdx - 1);
    const endIdx = Math.min(items.length, currentIdx + 2);
    return { visible: items.slice(startIdx, endIdx), currentIdx, startIdx };
  };

  const toggleExpanded = (turmaId: string) => {
    setExpandedTurmas((prev) => ({ ...prev, [turmaId]: !prev[turmaId] }));
  };

  const getProgress = (items: DisciplinaRow[]) => {
    const completed = items.filter((d) => d.data_termino < today).length;
    return { completed, total: items.length, percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0 };
  };

  const handleExportPDF = () => {
    const printContent = document.getElementById("cronograma-print-area");
    if (!printContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Cronograma</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        h2 { margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .current { background: #e0f2fe; }
        .progress-bar { background: #e5e7eb; border-radius: 4px; height: 8px; margin: 4px 0; }
        .progress-fill { background: #3b82f6; height: 8px; border-radius: 4px; }
      </style></head><body>
      <h1>Cronograma - ${filtroCurso} - ${filtroTurno}</h1>
      <p>Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
    `);

    Object.entries(turmaGroups).forEach(([turmaId, items]) => {
      const turmaName = items[0]?.turma_nome || "Sem turma";
      const progress = getProgress(items);
      printWindow.document.write(`
        <h2>${turmaName}</h2>
        <p>Progresso: ${progress.completed}/${progress.total} disciplinas concluídas (${progress.percent}%)</p>
        <div class="progress-bar"><div class="progress-fill" style="width:${progress.percent}%"></div></div>
        <table>
          <tr><th>#</th><th>Disciplina</th><th>Professor</th><th>Carga (h)</th><th>Diária</th><th>Dias</th><th>Início</th><th>Término</th><th>Status</th></tr>
      `);
      items.forEach((d, idx) => {
        const isPast = d.data_termino < today;
        let isCurrent = false;
        try { isCurrent = isWithinInterval(new Date(), { start: parseISO(d.data_inicio), end: parseISO(d.data_termino) }); } catch {}
        const status = isPast ? "Concluída" : isCurrent ? "Atual" : "Futura";
        printWindow.document.write(`
          <tr class="${isCurrent ? 'current' : ''}">
            <td>${idx + 1}</td><td>${d.nome}</td><td>${d.nome_professor || "—"}</td>
            <td>${d.carga_horaria_total}h</td><td>${d.carga_horaria_diaria}h</td><td>${d.dias_uteis}</td>
            <td>${formatDateBR(d.data_inicio)}</td><td>${formatDateBR(d.data_termino)}</td><td>${status}</td>
          </tr>
        `);
      });
      printWindow.document.write("</table>");
    });

    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      <FeriadosManager />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Gestão de Cronogramas
              </CardTitle>
              <CardDescription>
                Visualize e gerencie os cronogramas de disciplinas por turma
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleExportPDF} className="gap-2">
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </Button>
              <Button onClick={() => { setEditTurmaId(null); setSequenciaDialogOpen(true); }} className="gap-2">
                <ListOrdered className="w-4 h-4" />
                Cadastro de Sequência de Disciplinas por Turma
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Turno:</span>
              <Select value={filtroTurno} onValueChange={setFiltroTurno}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TURNOS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Curso:</span>
              <Select value={filtroCurso} onValueChange={setFiltroCurso}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURSOS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : Object.keys(turmaGroups).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <CalendarRange className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">Nenhum cronograma encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-md mb-4">
                Use o botão acima para cadastrar a sequência de disciplinas de uma turma.
              </p>
            </div>
          ) : (
            <div id="cronograma-print-area" className="max-h-[600px] overflow-y-auto space-y-6 pr-2">
              {Object.entries(turmaGroups).map(([turmaId, items]) => {
                const { visible, currentIdx, startIdx } = getVisibleDisciplinas(items, turmaId);
                const turmaName = items[0]?.turma_nome || "Sem turma";
                const isExpanded = expandedTurmas[turmaId] || false;
                const progress = getProgress(items);

                return (
                  <div key={turmaId} className="space-y-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{turmaName}</h3>
                        <Badge variant="outline" className="text-xs">
                          {items.length} disciplina(s)
                        </Badge>
                        {items.length > 3 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={() => toggleExpanded(turmaId)}
                          >
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {isExpanded ? "Recolher" : `Ver todas (${items.length})`}
                          </Button>
                        )}
                      </div>
                      <span className="inline-block bg-muted/60 rounded-md px-3 py-1 text-xs text-muted-foreground mt-1">
                        {[
                          items[0]?.turma_periodo && `Turno: ${items[0].turma_periodo}`,
                          items[0]?.turma_horario && `Horário: ${items[0].turma_horario}`,
                          items[0]?.turma_data_inicio && `Início: ${new Date(items[0].turma_data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}`,
                        ].filter(Boolean).join(" • ")}
                      </span>
                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mt-2">
                        <Progress value={progress.percent} className="h-2 flex-1 max-w-xs" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {progress.completed}/{progress.total} concluídas ({progress.percent}%)
                        </span>
                      </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[50px] text-center">#</TableHead>
                            <TableHead>Disciplina</TableHead>
                            <TableHead className="w-[150px]">Professor</TableHead>
                            <TableHead className="text-center w-[90px]">Carga (h)</TableHead>
                            <TableHead className="text-center w-[70px]">Diária</TableHead>
                            <TableHead className="text-center w-[70px]">Dias</TableHead>
                            <TableHead className="text-center w-[110px]">Início</TableHead>
                            <TableHead className="text-center w-[110px]">Término</TableHead>
                            <TableHead className="text-center w-[90px]">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visible.map((d, vIdx) => {
                            const globalIdx = startIdx + vIdx;
                            const isCurrent = globalIdx === currentIdx;
                            const isPast = d.data_termino < today;
                            const isFuture = d.data_inicio > today;

                            return (
                              <TableRow
                                key={d.id}
                                className={cn(
                                  "cursor-pointer",
                                  isCurrent
                                    ? "bg-primary/10 border-l-4 border-l-primary"
                                    : "hover:bg-muted/30"
                                )}
                                onClick={() => {
                                  setEditTurmaId(d.turma_id);
                                  setSequenciaDialogOpen(true);
                                }}
                              >
                                <TableCell className="text-center font-mono font-bold text-muted-foreground">
                                  {globalIdx + 1}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {d.nome}
                                  {isCurrent && (
                                    <Badge className="ml-2 text-[10px]" variant="default">
                                      Em andamento
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {d.nome_professor ? (
                                    <div className="flex items-center gap-1 text-sm">
                                      <User className="w-3 h-3 text-muted-foreground" />
                                      <span className="truncate">{d.nome_professor}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/50 text-xs">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">{d.carga_horaria_total}h</TableCell>
                                <TableCell className="text-center">{d.carga_horaria_diaria}h</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant="outline" className="font-mono">
                                    {d.dias_uteis}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {formatDateBR(d.data_inicio)}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {formatDateBR(d.data_termino)}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isPast ? (
                                    <Badge variant="secondary" className="text-[10px]">Concluída</Badge>
                                  ) : isCurrent ? (
                                    <Badge variant="default" className="text-[10px]">Atual</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">Futura</Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SequenciaDisciplinasDialog
        open={sequenciaDialogOpen}
        onOpenChange={handleSequenciaSaved}
        initialTurmaId={editTurmaId}
      />
    </div>
  );
};
