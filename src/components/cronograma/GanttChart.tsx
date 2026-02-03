import { Aula } from "@/hooks/useCronograma";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, User, BookOpen } from "lucide-react";

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
}: GanttChartProps) => {
  const turmaEntries = Object.entries(aulasByTurma);

  if (turmaEntries.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground border rounded-lg bg-card">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhuma aula agendada</p>
        <p className="text-sm">Clique em um dia para adicionar uma aula</p>
      </div>
    );
  }

  return (
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

            return (
              <div
                key={day.dateStr}
                className={cn(
                  "p-1 border-r last:border-r-0 min-h-[80px] cursor-pointer hover:bg-accent/30 transition-colors",
                  day.isToday && "bg-primary/5"
                )}
                onClick={() => onEmptyClick(day.dateStr)}
              >
                <div className="space-y-1">
                  {dayAulas.map((aula) => (
                    <div
                      key={aula.id}
                      className={cn(
                        "p-2 rounded text-xs text-white cursor-pointer transition-smooth",
                        statusColors[aula.status_aula || "Agendada"]
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAulaClick(aula);
                      }}
                    >
                      <div className="flex items-center gap-1 font-medium">
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
