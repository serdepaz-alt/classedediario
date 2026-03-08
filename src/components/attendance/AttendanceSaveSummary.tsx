import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Mail,
  FileText,
} from "lucide-react";

interface AttendanceSaveSummaryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
  previousStats?: {
    present: number;
    absent: number;
    late: number;
    total: number;
  } | null;
  date: Date;
  disciplinaNome: string;
  turmaNome: string;
  studentsWithIssues: number;
  notificationsSent: boolean;
  onExportPDF?: () => void;
}

export const AttendanceSaveSummary = ({
  open,
  onOpenChange,
  stats,
  previousStats,
  date,
  disciplinaNome,
  turmaNome,
  studentsWithIssues,
  notificationsSent,
  onExportPDF,
}: AttendanceSaveSummaryProps) => {
  const frequenciaPercent = stats.total > 0
    ? Math.round((stats.present / stats.total) * 100)
    : 0;

  const previousFrequencia = previousStats && previousStats.total > 0
    ? Math.round((previousStats.present / previousStats.total) * 100)
    : null;

  const trend = previousFrequencia !== null
    ? frequenciaPercent > previousFrequencia
      ? "up"
      : frequenciaPercent < previousFrequencia
      ? "down"
      : "stable"
    : null;

  const trendDiff = previousFrequencia !== null
    ? frequenciaPercent - previousFrequencia
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Chamada Salva com Sucesso!
          </DialogTitle>
          <DialogDescription>
            {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Class Info */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <p className="font-semibold text-foreground">{disciplinaNome}</p>
              <p className="text-sm text-muted-foreground">{turmaNome}</p>
            </div>
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {stats.total} alunos
            </Badge>
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-600">{stats.present}</p>
              <p className="text-xs text-muted-foreground">Presentes</p>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
              <XCircle className="w-5 h-5 mx-auto mb-1 text-red-600" />
              <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
              <p className="text-xs text-muted-foreground">Ausentes</p>
            </div>
            <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <Clock className="w-5 h-5 mx-auto mb-1 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600">{stats.late}</p>
              <p className="text-xs text-muted-foreground">Atrasados</p>
            </div>
          </div>

          {/* Frequency Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Frequência do Dia</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">{frequenciaPercent}%</span>
                {trend && (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      trend === "up"
                        ? "border-green-300 text-green-600"
                        : trend === "down"
                        ? "border-red-300 text-red-600"
                        : ""
                    }`}
                  >
                    {trend === "up" ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : trend === "down" ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : null}
                    {trendDiff > 0 ? "+" : ""}
                    {trendDiff}%
                  </Badge>
                )}
              </div>
            </div>
            <Progress value={frequenciaPercent} className="h-3" />
            {previousFrequencia !== null && (
              <p className="text-xs text-muted-foreground">
                Chamada anterior: {previousFrequencia}% de frequência
              </p>
            )}
          </div>

          <Separator />

          {/* Alerts and Notifications */}
          <div className="space-y-2">
            {studentsWithIssues > 0 && (
              <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  {studentsWithIssues} aluno(s) em situação de risco (2+ faltas/atrasos)
                </span>
              </div>
            )}

            {notificationsSent && (
              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  Notificações enviadas para alunos e administrativo
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          {onExportPDF && (
            <Button variant="outline" onClick={onExportPDF} className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            Concluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
