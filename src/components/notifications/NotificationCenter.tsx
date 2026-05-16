import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, MailWarning, Send, Clock, CalendarDays, ChevronDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface TurnoConfig {
  ativo: boolean;
  dias: string[];
  horario: string;
}

const defaultTurno = (dias: string[], horario: string): TurnoConfig => ({ ativo: true, dias, horario });

export const NotificationCenter = () => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<{ id: string; nome: string; curso?: string | null }[]>([]);
  const [selectedTurmas, setSelectedTurmas] = useState<string[]>([]);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [matutino, setMatutino] = useState<TurnoConfig>(defaultTurno(["Qua", "Qui", "Sex"], "14:00"));
  const [vespertino, setVespertino] = useState<TurnoConfig>(defaultTurno(["Qua", "Qui", "Sex"], "14:00"));
  const [noturno, setNoturno] = useState<TurnoConfig>(defaultTurno(["Qui", "Sex"], "09:00"));

  useEffect(() => {
    if (!user) return;
    supabase
      .from("turmas")
      .select("id, nome, curso")
      .eq("status", "Ativa")
      .order("nome")
      .then(({ data }) => {
        if (data) {
          setTurmas(data as any);
          setSelectedTurmas(data.map((t: any) => t.id));
        }
      });
  }, [user]);

  // Mock — would come from email_send_log aggregations
  const totalNaoAbertos = 347;
  const pctNaoAbertos = 28.9;
  const successData = [
    { d: "Sem 1", v: 82 },
    { d: "Sem 2", v: 89 },
    { d: "Sem 3", v: 88 },
    { d: "Sem 4", v: 91 },
    { d: "Sem 5", v: 99 },
  ];
  const historico = [
    { dt: "05/05/2026 16:00", id: "#00543", tipo: "Notas / Presença", alunos: 16, status: "Sucesso" },
    { dt: "05/05/2026 16:00", id: "#00543", tipo: "Notas / Presença", alunos: 16, status: "Parcial" },
    { dt: "28/04/2026 14:00", id: "#00541", tipo: "Presença", alunos: 22, status: "Sucesso" },
    { dt: "21/04/2026 14:00", id: "#00532", tipo: "Notas", alunos: 18, status: "Sucesso" },
  ];

  const turmasLabel = selectedTurmas.length === 0
    ? "Selecione Turmas Ativas"
    : selectedTurmas.length === turmas.length
      ? `Todas as Turmas (${turmas.length})`
      : `${selectedTurmas.length} turma(s) selecionada(s)`;

  const toggleTurma = (id: string) => {
    setSelectedTurmas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const TurnoCard = ({
    titulo,
    config,
    setConfig,
  }: {
    titulo: string;
    config: TurnoConfig;
    setConfig: (c: TurnoConfig) => void;
  }) => (
    <Card className="gradient-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={config.ativo} onCheckedChange={(v) => setConfig({ ...config, ativo: v })} />
          <Label className="text-xs">Ativar Agendamento</Label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Dias de Envio</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between h-8 text-xs">
                  <span className="truncate">{config.dias.join(", ") || "—"}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-40 p-2">
                {DIAS.map((d) => (
                  <label key={d} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer text-xs">
                    <Checkbox
                      checked={config.dias.includes(d)}
                      onCheckedChange={(checked) =>
                        setConfig({
                          ...config,
                          dias: checked ? [...config.dias, d] : config.dias.filter((x) => x !== d),
                        })
                      }
                    />
                    {d}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-muted-foreground">Horário</Label>
            <div className="relative">
              <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="time"
                value={config.horario}
                onChange={(e) => setConfig({ ...config, horario: e.target.value })}
                className="w-full h-8 pl-7 pr-2 text-xs rounded-md border border-input bg-background"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Bell className="w-7 h-7 text-primary" />
          Central de Notificações / Painel de Evolução
        </h1>
        <p className="text-muted-foreground">
          Dedicado exclusivamente às Configurações de Automação de E-mail, exceto para a visualização individual do
          Relatório do Aluno
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Painel de Configuração */}
        <div className="xl:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Painel de Configuração de Automação Semanal
          </h2>
          <Card className="gradient-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Configurar Agendamento de Envios Automáticos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
                  <Label className="text-sm font-medium">Ativar Envio Semanal Automático</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="sm:ml-auto justify-between min-w-[260px]">
                      <span className="truncate">{turmasLabel}</span>
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-2 max-h-72 overflow-y-auto">
                    {turmas.length === 0 && (
                      <p className="text-xs text-muted-foreground p-2">Nenhuma turma ativa</p>
                    )}
                    {turmas.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selectedTurmas.includes(t.id)}
                          onCheckedChange={() => toggleTurma(t.id)}
                        />
                        <span className="font-medium">{t.nome}</span>
                        {t.curso && <span className="text-xs text-muted-foreground">({t.curso})</span>}
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Política de Envio por Turno</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <TurnoCard titulo="Agendamento Matutino" config={matutino} setConfig={setMatutino} />
                  <TurnoCard titulo="Agendamento Vespertino" config={vespertino} setConfig={setVespertino} />
                  <TurnoCard titulo="Agendamento Noturno" config={noturno} setConfig={setNoturno} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Painel de Estatísticas */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Painel de Estatísticas de E-mails Não Abertos
          </h2>
          <Card className="gradient-card">
            <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
              <div>
                <div className="text-5xl font-bold text-foreground">{totalNaoAbertos}</div>
                <p className="text-sm text-muted-foreground mt-1">Total de E-mails Não Abertos</p>
              </div>
              <div className="w-full max-w-[200px]">
                <Gauge percentage={pctNaoAbertos} />
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-destructive">{pctNaoAbertos}% Não Abertos</span>{" "}
                vs. {(100 - pctNaoAbertos).toFixed(1)}% Abertos
              </p>
              <Button className="w-full gap-2">
                <Send className="w-4 h-4" />
                Reenviar para Alunos com E-mails Não Abertos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico e Métricas */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Histórico e Métricas de Envio Agendado (Registros de Automação)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="gradient-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Status de Sucesso
              </CardTitle>
              <CardDescription className="text-xs">Taxa de entrega por semana</CardDescription>
            </CardHeader>
            <CardContent className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={successData}>
                  <defs>
                    <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[60, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Area type="monotone" dataKey="v" stroke="hsl(var(--primary))" fill="url(#successGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="gradient-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Histórico de Lotes de E-mail
              </CardTitle>
              <CardDescription className="text-xs">
                Taxas gerais visíveis: Histórico ~99,2%, abertos ~75%, não abertos ~25%
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data/Hora Exata</TableHead>
                    <TableHead className="text-xs">ID do Lote</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Alunos Notificados</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historico.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs">{row.dt}</TableCell>
                      <TableCell className="text-xs font-mono">{row.id}</TableCell>
                      <TableCell className="text-xs">{row.tipo}</TableCell>
                      <TableCell className="text-xs">{row.alunos} alunos</TableCell>
                      <TableCell>
                        <Badge
                          variant={row.status === "Sucesso" ? "default" : "secondary"}
                          className={row.status === "Parcial" ? "bg-amber-500/15 text-amber-600 hover:bg-amber-500/20" : ""}
                        >
                          {row.status === "Parcial" && <MailWarning className="w-3 h-3 mr-1" />}
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Gauge = ({ percentage }: { percentage: number }) => {
  const angle = (percentage / 100) * 180 - 90;
  return (
    <svg viewBox="0 0 200 110" className="w-full">
      <defs>
        <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(142 70% 45%)" />
          <stop offset="50%" stopColor="hsl(45 90% 55%)" />
          <stop offset="100%" stopColor="hsl(0 75% 55%)" />
        </linearGradient>
      </defs>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round" />
      <line
        x1="100"
        y1="100"
        x2={100 + 70 * Math.cos((angle * Math.PI) / 180)}
        y2={100 + 70 * Math.sin((angle * Math.PI) / 180)}
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="100" cy="100" r="6" fill="hsl(var(--foreground))" />
    </svg>
  );
};