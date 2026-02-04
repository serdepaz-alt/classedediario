import { useState } from "react";
import { format, addWeeks, subWeeks, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCronograma, Aula, AulaFormData } from "@/hooks/useCronograma";
import { GanttChart } from "./GanttChart";
import { AulaFormDialog } from "./AulaFormDialog";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Loader2,
} from "lucide-react";

export const CronogramaView = () => {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAula, setSelectedAula] = useState<Aula | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [aulaToDelete, setAulaToDelete] = useState<Aula | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{
    aula: Aula;
    newDate: string;
    newTurmaId: string;
  } | null>(null);

  const {
    aulasByTurma,
    weekDays,
    isLoading,
    turmas,
    professores,
    disciplinas,
    createAula,
    updateAula,
    deleteAula,
  } = useCronograma(weekStart);

  const handlePrevWeek = () => setWeekStart((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setWeekStart((prev) => addWeeks(prev, 1));
  const handleToday = () =>
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleNewAula = () => {
    setSelectedAula(null);
    setDefaultDate(format(new Date(), "yyyy-MM-dd"));
    setFormOpen(true);
  };

  const handleAulaClick = (aula: Aula) => {
    setSelectedAula(aula);
    setDefaultDate("");
    setFormOpen(true);
  };

  const handleEmptyClick = (dateStr: string) => {
    setSelectedAula(null);
    setDefaultDate(dateStr);
    setFormOpen(true);
  };

  const handleSubmit = async (data: AulaFormData) => {
    if (selectedAula) {
      await updateAula.mutateAsync({ id: selectedAula.id, formData: data });
    } else {
      await createAula.mutateAsync(data);
    }
  };

  const handleAulaDrop = (aulaId: string, newDate: string, newTurmaId: string) => {
    const aula = Object.values(aulasByTurma)
      .flatMap(({ aulas }) => aulas)
      .find((a) => a.id === aulaId);
    
    if (aula) {
      setPendingMove({ aula, newDate, newTurmaId });
      setMoveDialogOpen(true);
    }
  };

  const confirmMove = async () => {
    if (pendingMove) {
      const { aula, newDate, newTurmaId } = pendingMove;
      await updateAula.mutateAsync({
        id: aula.id,
        formData: {
          turma_id: newTurmaId !== "sem-turma" ? newTurmaId : aula.turma_id || "",
          disciplina_id: aula.disciplina_id || undefined,
          professor_id: aula.professor_id || undefined,
          data_aula: newDate,
          hora_inicio: aula.hora_inicio,
          hora_fim: aula.hora_fim,
          status_aula: aula.status_aula || "Agendada",
          observacoes: aula.observacoes || undefined,
        },
      });
      setMoveDialogOpen(false);
      setPendingMove(null);
    }
  };

  const handleDeleteClick = () => {
    if (selectedAula) {
      setAulaToDelete(selectedAula);
      setFormOpen(false);
      setDeleteDialogOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (aulaToDelete) {
      await deleteAula.mutateAsync(aulaToDelete.id);
      setDeleteDialogOpen(false);
      setAulaToDelete(null);
    }
  };

  const weekLabel = format(weekStart, "'Semana de' dd 'de' MMMM", {
    locale: ptBR,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleToday}>
            <Calendar className="h-4 w-4 mr-2" />
            Hoje
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-2 text-lg font-semibold capitalize">
            {weekLabel}
          </span>
        </div>

        <Button onClick={handleNewAula}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Aula
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary/80" />
          <span className="text-sm text-muted-foreground">Agendada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-success/80" />
          <span className="text-sm text-muted-foreground">Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted" />
          <span className="text-sm text-muted-foreground">Realizada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-destructive/80" />
          <span className="text-sm text-muted-foreground">Cancelada</span>
        </div>
      </div>

      {/* Gantt Chart */}
      <GanttChart
        aulasByTurma={aulasByTurma}
        weekDays={weekDays}
        onAulaClick={handleAulaClick}
        onEmptyClick={handleEmptyClick}
        onAulaDrop={handleAulaDrop}
      />

      {/* Form Dialog */}
      <AulaFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setSelectedAula(null);
        }}
        aula={selectedAula}
        defaultDate={defaultDate}
        onSubmit={handleSubmit}
        isSubmitting={createAula.isPending || updateAula.isPending}
        turmas={turmas}
        professores={professores}
        disciplinas={disciplinas}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta aula agendada para{" "}
              <strong>{aulaToDelete?.data_aula}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAula.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Confirmation */}
      <AlertDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar realocação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja mover a aula de{" "}
              <strong>{pendingMove?.aula.data_aula}</strong> para{" "}
              <strong>{pendingMove?.newDate}</strong>?
              {pendingMove?.aula.professor && (
                <span className="block mt-2 text-sm">
                  Professor: {pendingMove.aula.professor.nome}
                </span>
              )}
              {pendingMove?.aula.disciplina && (
                <span className="block text-sm">
                  Disciplina: {pendingMove.aula.disciplina.nome}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingMove(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove}>
              {updateAula.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Mover aula"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
