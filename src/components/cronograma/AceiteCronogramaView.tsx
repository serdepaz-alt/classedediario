import { useState } from "react";
import { useAceiteCronograma, PendingAceite } from "@/hooks/useAceiteCronograma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AceiteCronogramaView = () => {
  const {
    pendingAulas,
    pendingCount,
    hasPending,
    isLoading,
    acceptAula,
    acceptAll,
  } = useAceiteCronograma();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"all" | "selected">("all");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingAulas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingAulas.map((a) => a.id)));
    }
  };

  const handleAcceptClick = (mode: "all" | "selected") => {
    setConfirmMode(mode);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (confirmMode === "all") {
      await acceptAll.mutateAsync();
    } else {
      // Accept selected one by one
      for (const id of selectedIds) {
        await acceptAula.mutateAsync(id);
      }
    }
    setSelectedIds(new Set());
    setConfirmOpen(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Aceite do Cronograma
            </h1>
            <p className="text-sm text-muted-foreground">
              Revise e confirme as aulas agendadas
            </p>
          </div>
        </div>
        {hasPending && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <AlertTriangle className="w-4 h-4 mr-1" />
            {pendingCount} aula{pendingCount > 1 ? "s" : ""} pendente
            {pendingCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Status Banner */}
      {!hasPending ? (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CardContent className="flex items-center gap-4 p-6">
            <ShieldCheck className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                Tudo em dia!
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                Todas as aulas do cronograma foram aceitas. O lançamento de notas
                está liberado.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="flex items-center gap-4 p-6">
            <AlertTriangle className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300">
                Aceite Pendente
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                O lançamento de notas está <strong>bloqueado</strong> até que
                todas as aulas pendentes sejam aceitas. Clique em "Li e Aceito"
                para liberar.
              </p>
            </div>
            <Button
              onClick={() => handleAcceptClick("all")}
              className="shrink-0"
              disabled={acceptAll.isPending}
            >
              {acceptAll.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Li e Aceito Tudo
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table of pending aulas */}
      {hasPending && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Aulas Pendentes de Aceite
            </CardTitle>
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAcceptClick("selected")}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Aceitar {selectedIds.size} selecionada{selectedIds.size > 1 ? "s" : ""}
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={
                          pendingAulas.length > 0 &&
                          selectedIds.size === pendingAulas.length
                        }
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Turma</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Professor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAulas.map((aula) => (
                    <TableRow key={aula.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(aula.id)}
                          onCheckedChange={() => toggleSelect(aula.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(parseISO(aula.data_aula), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          {aula.hora_inicio.slice(0, 5)} -{" "}
                          {aula.hora_fim.slice(0, 5)}
                        </div>
                      </TableCell>
                      <TableCell>{aula.turma?.nome || "—"}</TableCell>
                      <TableCell>{aula.disciplina?.nome || "—"}</TableCell>
                      <TableCell>{aula.professor?.nome || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {aula.status_aula || "Agendada"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-primary"
                          onClick={() => acceptAula.mutate(aula.id)}
                          disabled={acceptAula.isPending}
                        >
                          {acceptAula.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Aceitar
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Aceite</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMode === "all" ? (
                <>
                  Ao confirmar, você declara que <strong>leu e aceita</strong>{" "}
                  todas as {pendingCount} aulas pendentes do cronograma. O
                  lançamento de notas será liberado automaticamente.
                </>
              ) : (
                <>
                  Ao confirmar, você declara que <strong>leu e aceita</strong>{" "}
                  as {selectedIds.size} aulas selecionadas.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Li e Aceito
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
