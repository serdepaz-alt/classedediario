import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Loader2, CalendarRange, ListOrdered } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeriadosManager } from "./FeriadosManager";
import { SequenciaDisciplinasDialog } from "./SequenciaDisciplinasDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO, isWithinInterval } from "date-fns";
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
  turma_nome?: string;
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

  const fetchDisciplinas = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("disciplinas")
        .select("*, turmas!disciplinas_turma_id_fkey(nome)")
        .eq("user_id", user.id)
        .eq("turno", filtroTurno)
        .eq("curso", filtroCurso)
        .order("data_inicio", { ascending: true });

      if (error) throw error;

      const rows: DisciplinaRow[] = (data || []).map((d: any) => ({
        ...d,
        turma_nome: d.turmas?.nome || "—",
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

  // For each turma, find current discipline and show 2 before + current + 2 after
  const today = format(new Date(), "yyyy-MM-dd");

  const getVisibleDisciplinas = (items: DisciplinaRow[]) => {
    // Find current discipline (today is within start-end range)
    let currentIdx = items.findIndex((d) => {
      try {
        return isWithinInterval(new Date(), {
          start: parseISO(d.data_inicio),
          end: parseISO(d.data_termino),
        });
      } catch {
        return false;
      }
    });

    // If no current found, find next upcoming
    if (currentIdx === -1) {
      currentIdx = items.findIndex((d) => d.data_inicio > today);
    }

    // If still not found, show last 5
    if (currentIdx === -1) {
      currentIdx = Math.max(0, items.length - 3);
    }

    const startIdx = Math.max(0, currentIdx - 1);
    const endIdx = Math.min(items.length, currentIdx + 2);
    return { visible: items.slice(startIdx, endIdx), currentIdx, startIdx };
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
            <Button onClick={() => setSequenciaDialogOpen(true)} className="gap-2">
              <ListOrdered className="w-4 h-4" />
              Cadastro de Sequência de Disciplinas por Turma
            </Button>
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
            <div className="space-y-6">
              {Object.entries(turmaGroups).map(([turmaId, items]) => {
                const { visible, currentIdx, startIdx } = getVisibleDisciplinas(items);
                const turmaName = items[0]?.turma_nome || "Sem turma";

                return (
                  <div key={turmaId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{turmaName}</h3>
                      <Badge variant="outline" className="text-xs">
                        {items.length} disciplina(s)
                      </Badge>
                      {items.length > visible.length && (
                        <Badge variant="secondary" className="text-xs">
                          Exibindo {visible.length} de {items.length}
                        </Badge>
                      )}
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[50px] text-center">#</TableHead>
                            <TableHead>Disciplina</TableHead>
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
