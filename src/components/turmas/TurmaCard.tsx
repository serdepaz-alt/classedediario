import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal, Calendar, GraduationCap, Users, BookOpen } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TurmaStats } from "@/hooks/useTurmaStats";

interface TurmaCardProps {
  turma: {
    id: string;
    nome: string;
    ano_letivo: number;
    periodo: string | null;
    curso: string | null;
    disciplina: string | null;
    horario: string | null;
    data_inicio: string | null;
    status: string | null;
  };
  stats?: TurmaStats;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const TurmaCard = ({
  turma,
  stats,
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
      case "Concluída":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const mediaGeral = stats?.mediaGeral ?? 0;
  const frequencia = stats?.frequencia ?? 0;
  const totalAlunos = stats?.totalAlunos ?? 0;

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
              <DropdownMenuItem onClick={onViewDetails}>Ver Detalhes</DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status + Alunos */}
        <div className="flex items-center gap-2 mb-3">
          <Badge className={getStatusColor(turma.status)}>
            {turma.status || "Ativa"}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" />
            <span>{totalAlunos} aluno(s)</span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1 text-sm text-muted-foreground mb-3">
          <p>Turno: {turma.periodo || "Não definido"}</p>
          {turma.horario && <p>Horário: {turma.horario}</p>}
          {turma.data_inicio && (
            <p>Início: {new Date(turma.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}</p>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Ano: {turma.ano_letivo}</span>
          </div>
        </div>

        {/* Disciplina Atual */}
        {stats?.disciplinaAtual && (
          <div className="bg-primary/5 border border-primary/10 rounded-md px-3 py-1.5 mb-3">
            <div className="flex items-center gap-1.5 text-xs">
              <BookOpen className="w-3 h-3 text-primary" />
              <span className="text-muted-foreground">Em andamento:</span>
              <span className="font-medium text-foreground truncate">{stats.disciplinaAtual}</span>
            </div>
          </div>
        )}

        {/* Progresso do cronograma */}
        {stats && stats.totalDisciplinas > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Cronograma</span>
              <span className="text-muted-foreground">
                {stats.disciplinasConcluidas}/{stats.totalDisciplinas} ({stats.progressoPercent}%)
              </span>
            </div>
            <Progress value={stats.progressoPercent} className="h-1.5" />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <p className="text-xl font-bold text-primary">
              {mediaGeral.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Média Geral</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-green-600">
              {frequencia}%
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
