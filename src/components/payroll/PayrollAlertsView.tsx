import { useState } from "react";
import { usePayroll } from "@/hooks/usePayroll";
import { usePayrollEngine } from "@/hooks/usePayrollEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, AlertTriangle, Shield, Clock, TrendingUp } from "lucide-react";

export const PayrollAlertsView = () => {
  const { auditTrail, valoresHora, valoresEstagio } = usePayroll();
  const mesAtual = new Date().toISOString().slice(0, 7);
  const { summary } = usePayrollEngine(mesAtual);
  const [notifyProfessor, setNotifyProfessor] = useState(false);

  // Generate compliance alerts
  const complianceAlerts: { type: "critical" | "warning" | "info"; message: string; timestamp?: string }[] = [];

  // Hours exceeding limit
  summary.alertas.forEach((a) => {
    complianceAlerts.push({ type: "critical", message: a });
  });

  // Disciplinas without values
  const turnosWithValues = new Set(valoresHora.filter((v) => v.ativo).map((v) => v.turno));
  if (!turnosWithValues.has("Diurno")) complianceAlerts.push({ type: "warning", message: "Sem valor hora-aula cadastrado para turno Diurno" });
  if (!turnosWithValues.has("Noturno")) complianceAlerts.push({ type: "warning", message: "Sem valor hora-aula cadastrado para turno Noturno" });
  if (!turnosWithValues.has("Sábado")) complianceAlerts.push({ type: "warning", message: "Sem valor hora-aula cadastrado para turno Sábado" });

  if (valoresEstagio.filter((e) => e.ativo).length === 0) {
    complianceAlerts.push({ type: "warning", message: "Nenhum valor de estágio cadastrado" });
  }

  // Recent financial modifications (alert for Direction)
  const recentMods = auditTrail
    .filter((a) => a.tabela_afetada === "tabela_valores_hora" || a.tabela_afetada === "valores_estagio")
    .slice(0, 10);

  recentMods.forEach((mod) => {
    complianceAlerts.push({
      type: "info",
      message: `${mod.usuario_responsavel}: ${mod.acao}`,
      timestamp: mod.created_at,
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Sistema de Alertas</h3>
        </div>
        <div className="flex items-center gap-3 bg-card border rounded-lg px-4 py-2">
          <Label htmlFor="notify-prof" className="text-sm flex items-center gap-2">
            {notifyProfessor ? <Bell className="w-4 h-4 text-primary" /> : <BellOff className="w-4 h-4 text-muted-foreground" />}
            Notificar Professor
          </Label>
          <Switch id="notify-prof" checked={notifyProfessor} onCheckedChange={setNotifyProfessor} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-destructive/20 bg-destructive/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Alertas Críticos</p>
          <p className="text-2xl font-bold text-destructive">{complianceAlerts.filter((a) => a.type === "critical").length}</p>
        </CardContent></Card>
        <Card className="border-warning/20 bg-warning/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Avisos</p>
          <p className="text-2xl font-bold text-warning">{complianceAlerts.filter((a) => a.type === "warning").length}</p>
        </CardContent></Card>
        <Card className="border-primary/20 bg-primary/5"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Modificações Recentes</p>
          <p className="text-2xl font-bold text-primary">{recentMods.length}</p>
        </CardContent></Card>
      </div>

      {/* Alert Cards */}
      <div className="space-y-2">
        {complianceAlerts.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum alerta ativo. Sistema em conformidade.</p>
          </CardContent></Card>
        ) : complianceAlerts.map((alert, i) => (
          <Card key={i} className={
            alert.type === "critical" ? "border-destructive/30 bg-destructive/5" :
            alert.type === "warning" ? "border-warning/30 bg-warning/5" :
            "border-primary/20 bg-primary/5"
          }>
            <CardContent className="p-3 flex items-start gap-3">
              {alert.type === "critical" ? <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" /> :
               alert.type === "warning" ? <Clock className="w-4 h-4 text-warning mt-0.5 shrink-0" /> :
               <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm">{alert.message}</p>
                {alert.timestamp && <p className="text-xs text-muted-foreground mt-0.5">{new Date(alert.timestamp).toLocaleString("pt-BR")}</p>}
              </div>
              <Badge variant={alert.type === "critical" ? "destructive" : alert.type === "warning" ? "secondary" : "outline"} className="text-xs shrink-0">
                {alert.type === "critical" ? "Crítico" : alert.type === "warning" ? "Aviso" : "Info"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notify toggle info */}
      <Card className="border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">Regras de Notificação:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Direção:</strong> Recebe todos os alertas automaticamente (obrigatório, não desativável)</li>
            <li><strong>ADM:</strong> Recebe alertas de conformidade (horas excedentes, valores ausentes)</li>
            <li><strong>Professor:</strong> {notifyProfessor ? "✅ Notificações ativadas" : "❌ Notificações desativadas"} (toggle manual)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
