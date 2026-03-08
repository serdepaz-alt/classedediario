import { Professor } from "@/hooks/useProfessores";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Mail, Phone, GraduationCap, Briefcase } from "lucide-react";

interface ProfessorCardProps {
  professor: Professor;
  onEdit: (professor: Professor) => void;
  onDelete: (professor: Professor) => void;
}

export const ProfessorCard = ({ professor, onEdit, onDelete }: ProfessorCardProps) => {
  const statusColors: Record<string, string> = {
    Ativo: "bg-success/10 text-success border-success/20",
    Inativo: "bg-muted text-muted-foreground border-muted",
    Afastado: "bg-warning/10 text-warning border-warning/20",
  };

  return (
    <Card className="group hover:shadow-card transition-smooth cursor-pointer" onClick={() => onEdit(professor)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {professor.nome.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{professor.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={statusColors[professor.status || "Ativo"]}
                >
                  {professor.status || "Ativo"}
                </Badge>
                {professor.funcao && (
                  <Badge variant="secondary" className="text-xs">
                    {professor.funcao}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(professor)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(professor)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          {professor.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{professor.email}</span>
            </div>
          )}
          {professor.telefone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span>{professor.telefone}</span>
              {professor.telefone2 && <span className="text-muted-foreground/60">| {professor.telefone2}</span>}
            </div>
          )}
          {professor.especialidade && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span>{professor.especialidade}</span>
            </div>
          )}
          {professor.formacao && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{professor.formacao}</span>
            </div>
          )}
          {professor.coren && (
            <p className="text-xs text-muted-foreground">Coren: {professor.coren}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
