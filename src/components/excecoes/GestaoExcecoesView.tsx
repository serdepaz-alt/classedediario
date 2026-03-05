import { useState } from "react";
import { useGestaoExcecoes, AulaExcecao } from "@/hooks/useGestaoExcecoes";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertTriangle,
  UserX,
  UserPlus,
  XCircle,
  Loader2,
  ShieldAlert,
  DollarSign,
  Clock,
  Ban,
} from "lucide-react";

export const GestaoExcecoesView = () => {
  const {
    pendentes,
    canceladas,
    aulasAgendadas,
    professores,
    isLoading,
    marcarFalta,
    substituirProfessor,
    cancelarAula,
  } = useGestaoExcecoes();

  const [faltaDialog, setFaltaDialog] = useState(false);
  const [aulaFalta, setAulaFalta] = useState<AulaExcecao | null>(null);
  const [subDialog, setSubDialog] = useState(false);
  const [aulaSub, setAulaSub] = useState<AulaExcecao | null>(null);
  const [novoProfessorId, setNovoProfessorId] = useState("");
  const [cancelDialog, setCancelDialog] = useState(false);
  const [aulaCancel, setAulaCancel] = useState<AulaExcecao | null>(null);

  const handleMarcarFalta = (aula: AulaExcecao) => {
    setAulaFalta(aula);
    setFaltaDialog(true);
  };

  const confirmFalta = async () => {
    if (aulaFalta) {
      await marcarFalta.mutateAsync(aulaFalta.id);
      setFaltaDialog(false);
      setAulaFalta(null);
    }
  };

  const handleSubstituir = (aula: AulaExcecao) => {
    setAulaSub(aula);
    setNovoProfessorId("");
    setSubDialog(true);
  };

  const confirmSub = async () => {
    if (aulaSub && novoProfessorId) {
      await substituirProfessor.mutateAsync({
        aulaId: aulaSub.id,
        novoProfessorId,
      });
      setSubDialog(false);
      setAulaSub(null);
    }
  };

  const handleCancelar = (aula: AulaExcecao) => {
    setAulaCancel(aula);
    setCancelDialog(true);
  };

  const confirmCancel = async () => {
    if (aulaCancel) {
      await cancelarAula.mutateAsync(aulaCancel.id);
      setCancelDialog(false);
      setAulaCancel(null);
    }
  };

  const formatDate = (d: string) =>
    format(parseISO(d), "dd/MM/yyyy (EEEE)", { locale: ptBR });

  const novoProfessor = professores.find((p) => p.id === novoProfessorId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gestão de Exceções
          </h1>
          <p className="text-sm text-muted-foreground">
            Faltas de professor, substituições e estornos financeiros
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendentes.length}</p>
                <p className="text-sm text-muted-foreground">
                  Pendentes de Reposição
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{canceladas.length}</p>
                <p className="text-sm text-muted-foreground">
                  Canceladas (Estornadas)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  R${" "}
                  {pendentes
                    .reduce((s, a) => s + (a.valor_calculado || 0), 0)
                    .toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Valor Bloqueado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="registrar" className="space-y-4">
        <TabsList>
          <TabsTrigger value="registrar">
            <UserX className="w-4 h-4 mr-2" />
            Registrar Falta
          </TabsTrigger>
          <TabsTrigger value="pendentes">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Pendentes ({pendentes.length})
          </TabsTrigger>
          <TabsTrigger value="historico">
            <Ban className="w-4 h-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Tab: Registrar Falta */}
        <TabsContent value="registrar" className="space-y-3">
          {aulasAgendadas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma aula agendada/confirmada encontrada.
              </CardContent>
            </Card>
          ) : (
            aulasAgendadas.map((aula) => (
              <AulaCard
                key={aula.id}
                aula={aula}
                formatDate={formatDate}
                actions={
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleMarcarFalta(aula)}
                  >
                    <UserX className="w-4 h-4 mr-1" />
                    Registrar Falta
                  </Button>
                }
              />
            ))
          )}
        </TabsContent>

        {/* Tab: Pendentes de Reposição */}
        <TabsContent value="pendentes" className="space-y-3">
          {pendentes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma aula pendente de reposição.
              </CardContent>
            </Card>
          ) : (
            pendentes.map((aula) => (
              <AulaCard
                key={aula.id}
                aula={aula}
                formatDate={formatDate}
                actions={
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSubstituir(aula)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Substituir
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelar(aula)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                }
              />
            ))
          )}
        </TabsContent>

        {/* Tab: Histórico */}
        <TabsContent value="historico" className="space-y-3">
          {canceladas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma aula cancelada no histórico.
              </CardContent>
            </Card>
          ) : (
            canceladas.map((aula) => (
              <AulaCard
                key={aula.id}
                aula={aula}
                formatDate={formatDate}
                actions={
                  <Badge variant="destructive">
                    Cancelada / Estornada
                  </Badge>
                }
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Falta Confirmation */}
      <AlertDialog open={faltaDialog} onOpenChange={setFaltaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Registrar falta do professor</AlertDialogTitle>
            <AlertDialogDescription>
              A aula de{" "}
              <strong>
                {aulaFalta?.data_aula && formatDate(aulaFalta.data_aula)}
              </strong>{" "}
              será marcada como <strong>Pendente de Reposição</strong> e o
              financeiro será <strong>bloqueado automaticamente</strong>.
              {aulaFalta?.professor && (
                <span className="block mt-2">
                  Professor ausente: {aulaFalta.professor.nome}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmFalta}>
              {marcarFalta.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar Falta"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Substitution Dialog */}
      <Dialog open={subDialog} onOpenChange={setSubDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Substituir Professor</DialogTitle>
            <DialogDescription>
              Selecione o professor substituto. O custo será recalculado
              automaticamente com base no valor/hora do novo professor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {aulaSub?.professor && (
              <div className="text-sm">
                <span className="text-muted-foreground">
                  Professor original:{" "}
                </span>
                <strong>{aulaSub.professor.nome}</strong>
                <span className="text-muted-foreground">
                  {" "}
                  (R$ {aulaSub.professor.valor_hora}/h)
                </span>
              </div>
            )}
            <Select value={novoProfessorId} onValueChange={setNovoProfessorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o substituto" />
              </SelectTrigger>
              <SelectContent>
                {professores
                  .filter((p) => p.id !== aulaSub?.professor_id)
                  .map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} — R$ {p.valor_hora}/h
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {novoProfessor && aulaSub && (
              <Card className="bg-muted/50">
                <CardContent className="pt-4 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Novo valor/hora:</span>
                    <strong>R$ {novoProfessor.valor_hora}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Horário:</span>
                    <span>
                      {aulaSub.hora_inicio} – {aulaSub.hora_fim}
                    </span>
                  </div>
                  <div className="flex justify-between text-primary font-semibold">
                    <span>Custo estimado:</span>
                    <span>
                      R${" "}
                      {(
                        novoProfessor.valor_hora *
                        ((new Date(`1970-01-01T${aulaSub.hora_fim}`).getTime() -
                          new Date(
                            `1970-01-01T${aulaSub.hora_inicio}`
                          ).getTime()) /
                          3600000)
                      ).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmSub}
              disabled={!novoProfessorId || substituirProfessor.isPending}
            >
              {substituirProfessor.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Confirmar Substituição"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar aula definitivamente</AlertDialogTitle>
            <AlertDialogDescription>
              A aula será cancelada e o estorno financeiro será aplicado
              permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelarAula.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancelar Aula"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Sub-component for aula cards
const AulaCard = ({
  aula,
  formatDate,
  actions,
}: {
  aula: AulaExcecao;
  formatDate: (d: string) => string;
  actions: React.ReactNode;
}) => (
  <Card>
    <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">
            {formatDate(aula.data_aula)}
          </span>
          <Badge
            variant={
              aula.status_aula === "Pendente de Reposição"
                ? "secondary"
                : aula.status_aula === "Cancelada"
                ? "destructive"
                : "default"
            }
          >
            {aula.status_aula}
          </Badge>
          {aula.status_financeiro === "Bloqueado" && (
            <Badge variant="outline" className="text-destructive border-destructive">
              💰 Bloqueado
            </Badge>
          )}
        </div>
        <div className="text-sm text-muted-foreground space-x-3">
          <span>🕐 {aula.hora_inicio} – {aula.hora_fim}</span>
          {aula.turma && <span>📚 {aula.turma.nome}</span>}
          {aula.professor && <span>👤 {aula.professor.nome}</span>}
          {aula.disciplina && <span>📖 {aula.disciplina.nome}</span>}
          {aula.valor_calculado != null && (
            <span>💲 R$ {aula.valor_calculado.toFixed(2)}</span>
          )}
        </div>
      </div>
      <div className="flex-shrink-0">{actions}</div>
    </CardContent>
  </Card>
);
