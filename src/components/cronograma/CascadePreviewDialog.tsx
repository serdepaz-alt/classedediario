import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CascadeChange } from "@/hooks/useAutoCascade";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

interface CascadePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changes: CascadeChange[];
  isApplying: boolean;
  onConfirm: () => void;
}

const formatDate = (dateStr: string) => {
  try {
    return format(parseISO(dateStr), "dd 'de' MMMM (EEE)", { locale: ptBR });
  } catch {
    return dateStr;
  }
};

export const CascadePreviewDialog = ({
  open,
  onOpenChange,
  changes,
  isApplying,
  onConfirm,
}: CascadePreviewDialogProps) => {
  const hasChanges = changes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasChanges ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-primary" />
            )}
            Auto-Cascade: Prévia de Realocação
          </DialogTitle>
          <DialogDescription>
            {hasChanges
              ? `${changes.length} aula(s) serão realocadas para os próximos dias úteis disponíveis.`
              : "Nenhuma aula encontrada nesta data para realocação."}
          </DialogDescription>
        </DialogHeader>

        {hasChanges && (
          <div className="flex-1 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Turma</TableHead>
                  <TableHead>Disciplina</TableHead>
                  <TableHead>Professor</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead className="text-center">Realocação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changes.map((change) => (
                  <TableRow key={change.aulaId}>
                    <TableCell className="font-medium text-sm">
                      {change.turma}
                    </TableCell>
                    <TableCell className="text-sm">{change.disciplina}</TableCell>
                    <TableCell className="text-sm">{change.professor}</TableCell>
                    <TableCell className="text-sm">{change.horario}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {formatDate(change.oldDate)}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <Badge
                          variant="default"
                          className="whitespace-nowrap bg-primary"
                        >
                          {formatDate(change.newDate)}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {hasChanges && (
            <Button onClick={onConfirm} disabled={isApplying}>
              {isApplying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar Realocação ({changes.length})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
