import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  Users,
  BookOpen,
  Info,
  Edit,
} from "lucide-react";

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
  turmas?: {
    nome: string;
  } | null;
}

interface DisciplinaCardProps {
  title: string;
  disciplinas: Disciplina[];
  isExpanded: boolean;
  onToggle: () => void;
  currentDisciplina?: Disciplina | null;
  onSelectDisciplina?: (disciplina: Disciplina) => void;
  onDetailsClick?: (disciplina: Disciplina) => void;
  onEditClick?: (disciplina: Disciplina) => void;
  variant?: "past" | "current" | "future";
}

export const DisciplinaCard = ({
  title,
  disciplinas,
  isExpanded,
  onToggle,
  currentDisciplina,
  onSelectDisciplina,
  onDetailsClick,
  onEditClick,
  variant = "current",
}: DisciplinaCardProps) => {
  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR });
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "past":
        return "border-l-4 border-l-muted-foreground/50";
      case "future":
        return "border-l-4 border-l-blue-500";
      default:
        return "border-l-4 border-l-primary";
    }
  };

  const renderDisciplinaDetails = (disciplina: Disciplina) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Disciplina</p>
            <p className="font-medium text-sm">{disciplina.nome}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Turma/Ano</p>
            <p className="font-medium text-sm">
              {disciplina.turmas?.nome || "N/A"} ({disciplina.curso})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-primary">P</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Professor</p>
            <p className="font-medium text-sm">{disciplina.nome_professor || "Não informado"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Data de Início</p>
            <p className="font-medium text-sm">{formatDate(disciplina.data_inicio)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Data de Término</p>
            <p className="font-medium text-sm">{formatDate(disciplina.data_termino)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Carga Horária Total</p>
            <p className="font-medium text-sm">{disciplina.carga_horaria_total || 0} min</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Quantidade de Dias</p>
            <p className="font-medium text-sm">
              {(disciplina.dias_uteis || 0) - (disciplina.dias_subtraidos || 0)} dias
            </p>
          </div>
        </div>
      </div>

      {variant === "current" && onDetailsClick && onEditClick && (
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => onDetailsClick(disciplina)}
          >
            <Info className="w-4 h-4 mr-2" />
            Detalhes da Disciplina
          </Button>
          <Button 
            className="flex-1"
            onClick={() => onEditClick(disciplina)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar Disciplina
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <Card className={`gradient-card shadow-card border-0 ${getVariantStyles()}`}>
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-foreground">{title}</h3>
              <Badge variant="secondary" className="text-xs">
                {disciplinas.length} {disciplinas.length === 1 ? "disciplina" : "disciplinas"}
              </Badge>
            </div>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {disciplinas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma disciplina encontrada.
              </p>
            ) : variant === "current" && currentDisciplina ? (
              renderDisciplinaDetails(currentDisciplina)
            ) : (
              <div className="space-y-2">
                {disciplinas.map((disciplina) => (
                  <div
                    key={disciplina.id}
                    className="p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
                    onClick={() => onSelectDisciplina?.(disciplina)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{disciplina.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {disciplina.turmas?.nome || "N/A"} • {formatDate(disciplina.data_inicio)} - {formatDate(disciplina.data_termino)}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {disciplina.turno}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
