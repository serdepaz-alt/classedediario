import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Calendar, GraduationCap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TurmaCardProps {
  turma: {
    id: string;
    nome: string;
    ano_letivo: number;
    periodo: string | null;
    curso: string | null;
    disciplina: string | null;
    horario: string | null;
    status: string | null;
  };
  stats?: {
    mediaGeral: number;
    frequencia: number;
  };
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TurmaCard = ({
  turma,
  stats = { mediaGeral: 0, frequencia: 0 },
  onViewDetails,
  onEdit,
  onDelete,
}: TurmaCardProps) => {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Ativa":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Inativa":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "Aguardando":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (year: number, month?: number) => {
    if (month) {
      const monthNames = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];
      return `${monthNames[month - 1]}/${year}`;
    }
    return `${year}`;
  };

  return (
    <Card className="bg-card border hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{turma.nome}</h3>
              {turma.curso && (
                <p className="text-xs text-muted-foreground">({turma.curso})</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background z-50">
              <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive"
              >
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Badge */}
        <div className="mb-3">
          <Badge className={getStatusColor(turma.status)}>
            {turma.status || "Ativa"}
          </Badge>
        </div>

        {/* Discipline Info */}
        {turma.disciplina && (
          <p className="text-sm text-foreground mb-1">
            Disciplina: {turma.disciplina}
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-1">
          Turno: {turma.periodo || "Não definido"}
        </p>
        {turma.horario && (
          <p className="text-sm text-muted-foreground mb-1">
            Horário: {turma.horario}
          </p>
        )}
        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>Ano: {turma.ano_letivo}</span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xl font-bold text-primary">
              {stats.mediaGeral.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Média Geral</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">
              {stats.frequencia}%
            </p>
            <p className="text-xs text-muted-foreground">Frequência</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-primary hover:text-primary"
            onClick={onViewDetails}
          >
            Ver Detalhes
          </Button>
          <Button size="sm" className="flex-1" onClick={onEdit}>
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
