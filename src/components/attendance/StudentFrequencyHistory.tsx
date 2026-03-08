import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface StudentFrequencyHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: { id: string; nome: string; matricula: string } | null;
  disciplinaId: string | null;
  disciplinaNome?: string;
}

interface AttendanceRecord {
  id: string;
  data: string;
  status: string;
  justificativa: string | null;
}

export const StudentFrequencyHistory = ({
  open,
  onOpenChange,
  student,
  disciplinaId,
  disciplinaNome,
}: StudentFrequencyHistoryProps) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!open || !user || !student || !disciplinaId) return;

      setLoading(true);
      const { data, error } = await supabase
        .from("presencas")
        .select("id, data, status, justificativa")
        .eq("user_id", user.id)
        .eq("student_id", student.id)
        .eq("disciplina_id", disciplinaId)
        .order("data", { ascending: false });

      if (!error && data) {
        setRecords(data);
      }
      setLoading(false);
    };

    fetchHistory();
  }, [open, user, student, disciplinaId]);

  if (!student) return null;

  const stats = {
    total: records.length,
    presente: records.filter((r) => r.status === "presente").length,
    ausente: records.filter((r) => r.status === "ausente").length,
    atrasado: records.filter((r) => r.status === "atrasado").length,
  };

  const frequenciaPercent = stats.total > 0
    ? Math.round((stats.presente / stats.total) * 100)
    : 100;

  const pontualidadePercent = stats.total > 0
    ? Math.round(((stats.presente) / (stats.presente + stats.atrasado || 1)) * 100)
    : 100;

  const isAtRisk = stats.ausente >= 2 || stats.atrasado >= 3;
  const isCritical = frequenciaPercent < 75;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "presente":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "ausente":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "atrasado":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "presente":
        return "Presente";
      case "ausente":
        return "Ausente";
      case "atrasado":
        return "Atrasado";
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Histórico de Frequência</span>
            {isAtRisk && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Em Risco
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-semibold text-foreground">{student.nome}</p>
            <p className="text-sm text-muted-foreground">
              Matrícula: {student.matricula}
            </p>
            {disciplinaNome && (
              <p className="text-xs text-muted-foreground mt-1">
                Disciplina: {disciplinaNome}
              </p>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
              <p className="text-lg font-bold text-green-600">{stats.presente}</p>
              <p className="text-[10px] text-muted-foreground">Presenças</p>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
              <p className="text-lg font-bold text-red-600">{stats.ausente}</p>
              <p className="text-[10px] text-muted-foreground">Faltas</p>
            </div>
            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
              <p className="text-lg font-bold text-yellow-600">{stats.atrasado}</p>
              <p className="text-[10px] text-muted-foreground">Atrasos</p>
            </div>
            <div className="text-center p-2 bg-primary/10 rounded-lg">
              <p className="text-lg font-bold text-primary">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Frequency Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Frequência Geral</span>
              <span className={`text-sm font-bold ${isCritical ? "text-red-500" : "text-green-500"}`}>
                {frequenciaPercent}%
              </span>
            </div>
            <Progress
              value={frequenciaPercent}
              className={`h-2 ${isCritical ? "[&>div]:bg-red-500" : ""}`}
            />
            {isCritical && (
              <div className="flex items-center gap-1 text-xs text-red-500">
                <TrendingDown className="w-3 h-3" />
                <span>Abaixo do mínimo de 75% para aprovação</span>
              </div>
            )}
          </div>

          {/* Punctuality */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Taxa de Pontualidade</span>
              <span className="text-sm font-bold text-primary">{pontualidadePercent}%</span>
            </div>
            <Progress value={pontualidadePercent} className="h-2" />
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Histórico de Registros
            </p>
            <ScrollArea className="h-[200px]">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Carregando...
                </p>
              ) : records.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum registro encontrado
                </p>
              ) : (
                <div className="space-y-2">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-2 bg-background border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="text-sm font-medium">
                            {format(new Date(record.data), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(record.data), "EEEE", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            record.status === "presente"
                              ? "default"
                              : record.status === "ausente"
                              ? "destructive"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {getStatusLabel(record.status)}
                        </Badge>
                        {record.justificativa && (
                          <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate">
                            {record.justificativa}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
