import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraduationCap, Users, BookOpen, Calendar, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TurmaStats } from "@/hooks/useTurmaStats";

interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  periodo: string | null;
  curso: string | null;
  disciplina: string | null;
  horario: string | null;
  data_inicio: string | null;
  status: string | null;
}

interface TurmaTableViewProps {
  turmas: Turma[];
  statsMap: Record<string, TurmaStats>;
  onViewDetails: (turma: Turma) => void;
  onEdit: (turma: Turma) => void;
  onDelete: (turma: Turma) => void;
}

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "Ativa": return "bg-green-500/10 text-green-600 border-green-500/20";
    case "Inativa": return "bg-red-500/10 text-red-600 border-red-500/20";
    case "Aguardando": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    case "Concluída": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

export const TurmaTableView = ({ turmas, statsMap, onViewDetails, onEdit, onDelete }: TurmaTableViewProps) => {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Turma</TableHead>
            <TableHead>Curso</TableHead>
            <TableHead className="text-center">Turno</TableHead>
            <TableHead className="text-center">Alunos</TableHead>
            <TableHead className="text-center">Média</TableHead>
            <TableHead className="text-center">Frequência</TableHead>
            <TableHead>Disciplina Atual</TableHead>
            <TableHead className="text-center">Progresso</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {turmas.map((turma) => {
            const s = statsMap[turma.id];
            return (
              <TableRow
                key={turma.id}
                className="cursor-pointer hover:bg-muted/30"
                onClick={() => onViewDetails(turma)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <span className="font-medium text-foreground">{turma.nome}</span>
                      {turma.data_inicio && (
                        <p className="text-xs text-muted-foreground">
                          Início: {new Date(turma.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{turma.curso || "—"}</TableCell>
                <TableCell className="text-center text-sm">{turma.periodo || "—"}</TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1 text-sm">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    {s?.totalAlunos ?? 0}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold text-primary">
                  {(s?.mediaGeral ?? 0).toFixed(1)}
                </TableCell>
                <TableCell className="text-center font-semibold text-green-600">
                  {s?.frequencia ?? 0}%
                </TableCell>
                <TableCell className="text-sm max-w-[150px] truncate">
                  {s?.disciplinaAtual ? (
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate">{s.disciplinaAtual}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {s && s.totalDisciplinas > 0 ? (
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress value={s.progressoPercent} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {s.progressoPercent}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={getStatusColor(turma.status)}>
                    {turma.status || "Ativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-background z-50">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(turma); }}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); onDelete(turma); }}
                        className="text-destructive"
                      >
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
