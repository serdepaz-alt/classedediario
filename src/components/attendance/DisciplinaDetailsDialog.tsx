import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, X } from "lucide-react";

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
  turmas?: {
    nome: string;
  } | null;
}

interface DisciplinaDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disciplina: Disciplina | null;
}

export const DisciplinaDetailsDialog = ({
  open,
  onOpenChange,
  disciplina,
}: DisciplinaDetailsDialogProps) => {
  if (!disciplina) return null;

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd/MM/yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes da Disciplina</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Disciplina:</p>
              <p className="font-medium">{disciplina.nome}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Início</p>
              <p className="font-medium">{formatDate(disciplina.data_inicio)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data de Término</p>
              <p className="font-medium">{formatDate(disciplina.data_termino)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Turma</p>
              <p className="font-medium">{disciplina.turmas?.nome || "N/A"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Curso:</p>
              <p className="font-medium">{disciplina.curso}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carga Horária Diária</p>
              <p className="font-medium">{disciplina.carga_horaria_diaria} min</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Turno:</p>
              <p className="font-medium">{disciplina.turno}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carga Horária Total</p>
              <p className="font-medium">{disciplina.carga_horaria_total || 0} min</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Dias Úteis:</p>
              <p className="font-medium">{disciplina.dias_uteis || 0} dias</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Feriados:</p>
              <p className="font-medium">{disciplina.dias_subtraidos || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Dias Efetivos:</p>
              <p className="font-medium">
                {(disciplina.dias_uteis || 0) - (disciplina.dias_subtraidos || 0)} dias
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Professor:</p>
              <p className="font-medium">{disciplina.nome_professor || "Não informado"}</p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="default" className="flex-1">
              <ChevronDown className="h-4 w-4 mr-2" />
              Expandir Detalhes
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
