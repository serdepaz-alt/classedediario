import { useState } from "react";
import { Aula } from "@/hooks/useCronograma";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, User, BookOpen, GripVertical } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GanttChartProps {
  aulasByTurma: Record<string, { turma: Aula["turma"]; aulas: Aula[] }>;
  weekDays: Array<{
    date: Date;
    dateStr: string;
    dayName: string;
    dayNumber: string;
    isToday: boolean;
  }>;
  onAulaClick: (aula: Aula) => void;
  onEmptyClick: (dateStr: string) => void;
  onAulaDrop?: (aulaId: string, newDate: string, turmaId: string) => void;
}

const statusColors: Record<string, string> = {
  Agendada: "bg-primary/80 hover:bg-primary",
  Confirmada: "bg-success/80 hover:bg-success",
  Realizada: "bg-muted hover:bg-muted/80",
  Cancelada: "bg-destructive/80 hover:bg-destructive",
};

export const GanttChart = ({
  aulasByTurma,
  weekDays,
  onAulaClick,
  onEmptyClick,
  onAulaDrop,
}: GanttChartProps) => {
  const [draggedAula, setDraggedAula] = useState<Aula | null>(null);
  const [dropTarget, setDropTarget] = useState<{ dateStr: string; turmaId: string } | null>(null);

  const turmaEntries = Object.entries(aulasByTurma);

  const isAulaDraggable = (aula: Aula) => {
    const status = aula.status_aula || "Agendada";
    return status !== "Realizada" && status !== "Cancelada";
  };

  const handleDragStart = (e: React.DragEvent, aula: Aula) => {
    if (!isAulaDraggable(aula)) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDraggedAula(aula);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", aula.id);
  };

  const handleDragEnd = () => {
    setDraggedAula(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string, turmaId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ dateStr, turmaId });
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: React.DragEvent, dateStr: string, turmaId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (draggedAula && onAulaDrop) {
      // Only update if dropped on a different day or turma
      if (draggedAula.data_aula !== dateStr || draggedAula.turma_id !== turmaId) {
        onAulaDrop(draggedAula.id, dateStr, turmaId);
      }
    }
    
    setDraggedAula(null);
    setDropTarget(null);
  };

  if (turmaEntries.length === 0) {
    return (
      <TooltipProvider>
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhuma aula agendada</p>
          <p className="text-sm">Clique em um dia para adicionar uma aula</p>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg bg-card overflow-hidden">
        {/* Header - Dias da Semana */}
        <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b bg-muted/30">
          <div className="p-3 font-semibold text-sm text-muted-foreground border-r">
            Turma
          </div>
          {weekDays.map((day) => (
            <div
              key={day.dateStr}
              className={cn(
                "p-3 text-center border-r last:border-r-0 cursor-pointer hover:bg-accent/50 transition-colors",
                day.isToday && "bg-primary/10"
              )}
              onClick={() => onEmptyClick(day.dateStr)}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {day.dayName}
              </div>
              <div
                className={cn(
                  "text-lg font-semibold",
                  day.isToday && "text-primary"
                )}
              >
                {day.dayNumber}
              </div>
            </div>
          ))}
        </div>

        {/* Rows - Turmas */}
        {turmaEntries.map(([turmaId, { turma, aulas }]) => (
          <div
            key={turmaId}
            className="grid grid-cols-[200px_repeat(7,1fr)] border-b last:border-b-0"
          >
            {/* Turma Label */}
            <div className="p-3 border-r bg-muted/10">
              <div className="font-medium text-sm truncate">
                {turma?.nome || "Sem turma"}
              </div>
              {turma?.curso && (
                <div className="text-xs text-muted-foreground truncate">
                  {turma.curso}
                </div>
              )}
            </div>

            {/* Dias */}
            {weekDays.map((day) => {
              const dayAulas = aulas.filter((a) => a.data_aula === day.dateStr);
              const isDropTarget = dropTarget?.dateStr === day.dateStr && dropTarget?.turmaId === turmaId;

              return (
                <div
                  key={day.dateStr}
                  className={cn(
                    "p-1 border-r last:border-r-0 min-h-[80px] cursor-pointer transition-all duration-200",
                    day.isToday && "bg-primary/5",
                    isDropTarget && "bg-primary/20 ring-2 ring-primary ring-inset",
                    !isDropTarget && "hover:bg-accent/30"
                  )}
                  onClick={() => onEmptyClick(day.dateStr)}
                  onDragOver={(e) => handleDragOver(e, day.dateStr, turmaId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.dateStr, turmaId)}
                >
                  <div className="space-y-1">
                    {dayAulas.map((aula) => {
                      const isDraggable = isAulaDraggable(aula);
                      const status = aula.status_aula || "Agendada";
                      
                      const aulaCard = (
                        <div
                          key={aula.id}
                          draggable={isDraggable}
                          onDragStart={(e) => handleDragStart(e, aula)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "p-2 rounded text-xs text-white transition-all duration-200 group",
                            statusColors[status],
                            isDraggable && "cursor-grab active:cursor-grabbing",
                            !isDraggable && "cursor-not-allowed opacity-80",
                            draggedAula?.id === aula.id && "opacity-50 scale-95"
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAulaClick(aula);
                          }}
                        >
                          <div className="flex items-center gap-1 font-medium">
                            {isDraggable && (
                              <GripVertical className="h-3 w-3 opacity-0 group-hover:opacity-70 transition-opacity" />
                            )}
                            <Clock className="h-3 w-3" />
                            {aula.hora_inicio.slice(0, 5)} - {aula.hora_fim.slice(0, 5)}
                          </div>
                          {aula.professor && (
                            <div className="flex items-center gap-1 mt-1 opacity-90">
                              <User className="h-3 w-3" />
                              <span className="truncate">{aula.professor.nome}</span>
                            </div>
                          )}
                          {aula.disciplina && (
                            <div className="flex items-center gap-1 mt-0.5 opacity-90">
                              <BookOpen className="h-3 w-3" />
                              <span className="truncate">{aula.disciplina.nome}</span>
                            </div>
                          )}
                        </div>
                      );
                      
                      if (!isDraggable) {
                        return (
                          <Tooltip key={aula.id}>
                            <TooltipTrigger asChild>
                              {aulaCard}
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                Aulas com status "{status}" não podem ser movidas
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      }
                      
                      return aulaCard;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </TooltipProvider>
  );
};
