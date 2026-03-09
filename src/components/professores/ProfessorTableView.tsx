import { Professor } from "@/hooks/useProfessores";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, Mail, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProfessorStats } from "@/hooks/useProfessorStats";

interface ProfessorTableViewProps {
  professores: Professor[];
  statsMap: Record<string, ProfessorStats>;
  onViewProfile: (p: Professor) => void;
  onEdit: (p: Professor) => void;
  onDelete: (p: Professor) => void;
}

const statusColors: Record<string, string> = {
  Ativo: "bg-success/10 text-success border-success/20",
  Inativo: "bg-muted text-muted-foreground border-muted",
  Afastado: "bg-warning/10 text-warning border-warning/20",
};

export const ProfessorTableView = ({ professores, statsMap, onViewProfile, onEdit, onDelete }: ProfessorTableViewProps) => {
  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Professor</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-center">Aulas</TableHead>
            <TableHead className="text-center">Horas</TableHead>
            <TableHead>Turmas</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {professores.map((p) => {
            const s = statsMap[p.id];
            return (
              <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => onViewProfile(p)}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">{p.nome.charAt(0)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{p.nome}</span>
                      {p.especialidade && <p className="text-xs text-muted-foreground">{p.especialidade}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{p.funcao || "—"}</TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {p.email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</div>}
                    {p.telefone && <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.telefone}</div>}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">{s?.totalAulas ?? 0}</TableCell>
                <TableCell className="text-center font-semibold">{Math.round(s?.totalHoras ?? 0)}h</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 flex-wrap">
                    {s?.turmas.slice(0, 2).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                    {(s?.turmas.length ?? 0) > 2 && (
                      <span className="text-[10px] text-muted-foreground">+{(s?.turmas.length ?? 0) - 2}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={statusColors[p.status || "Ativo"]}>{p.status || "Ativo"}</Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(p); }}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(p); }} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
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
