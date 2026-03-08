import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Users, 
  Clock, 
  ChevronRight, 
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Disciplina {
  id: string;
  nome: string;
  turno: string;
  curso: string;
  data_inicio: string;
  data_termino: string;
  carga_horaria_diaria: number;
  carga_horaria_total: number | null;
  dias_uteis: number | null;
  dias_subtraidos: number | null;
  nome_professor: string | null;
  turma_id: string | null;
  turmas?: { nome: string } | null;
}

interface TurmaGroup {
  turmaId: string;
  turmaNome: string;
  turno: string;
  curso: string;
  disciplinas: Disciplina[];
  disciplinaAtual: Disciplina | null;
  totalAlunos?: number;
  chamadaFeita?: boolean;
}

interface TurmaAttendanceCardProps {
  turma: TurmaGroup;
  isSelected: boolean;
  onSelect: (turma: TurmaGroup) => void;
}

export const TurmaAttendanceCard = ({
  turma,
  isSelected,
  onSelect,
}: TurmaAttendanceCardProps) => {
  const today = startOfDay(new Date());
  const disc = turma.disciplinaAtual;

  const getTurnoIcon = (turno: string) => {
    switch (turno) {
      case "Matutino": return "🌅";
      case "Vespertino": return "☀️";
      case "Noturno": return "🌙";
      default: return "📚";
    }
  };

  const getProgress = () => {
    if (!disc) return 0;
    const start = startOfDay(new Date(disc.data_inicio));
    const end = startOfDay(new Date(disc.data_termino));
    const total = differenceInCalendarDays(end, start) || 1;
    const elapsed = differenceInCalendarDays(today, start);
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  };

  const getDiasRestantes = () => {
    if (!disc) return 0;
    const end = startOfDay(new Date(disc.data_termino));
    return Math.max(0, differenceInCalendarDays(end, today));
  };

  const progress = getProgress();
  const diasRestantes = getDiasRestantes();

  return (
    <Card
      className={`relative overflow-hidden cursor-pointer transition-all duration-200 border-2 ${
        isSelected
          ? "border-primary shadow-lg ring-2 ring-primary/20"
          : "border-transparent hover:border-primary/30 hover:shadow-md"
      }`}
      onClick={() => onSelect(turma)}
    >
      {/* Top colored bar */}
      <div className={`h-1.5 ${
        isSelected ? "bg-primary" : disc ? "bg-primary/40" : "bg-muted-foreground/30"
      }`} />

      <div className="p-4 space-y-3">
        {/* Turma header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getTurnoIcon(turma.turno)}</span>
            <div>
              <h3 className="font-bold text-foreground text-base">{turma.turmaNome}</h3>
              <p className="text-xs text-muted-foreground">{turma.curso} • {turma.turno}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {turma.chamadaFeita && (
              <Badge variant="outline" className="text-xs border-green-300 text-green-600 bg-green-50">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Feita
              </Badge>
            )}
            <ChevronRight className={`w-5 h-5 transition-transform ${isSelected ? "text-primary rotate-90" : "text-muted-foreground"}`} />
          </div>
        </div>

        {/* Current discipline info */}
        {disc ? (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="font-semibold text-sm text-foreground">{disc.nome}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {format(new Date(disc.data_inicio), "dd/MM")} - {format(new Date(disc.data_termino), "dd/MM")}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {diasRestantes}d restantes
              </span>
              {disc.nome_professor && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {disc.nome_professor}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground font-medium">{progress}%</span>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Nenhuma disciplina ativa hoje</p>
          </div>
        )}

        {/* Quick action */}
        {isSelected && disc && (
          <Button size="sm" className="w-full" variant="default">
            <Users className="w-4 h-4 mr-2" />
            Iniciar Chamada
          </Button>
        )}
      </div>
    </Card>
  );
};
