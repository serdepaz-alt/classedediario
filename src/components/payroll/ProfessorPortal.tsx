import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, LogIn, Eye, EyeOff, FileDown, MessageSquareWarning, Clock, CheckCircle2, Loader2 } from "lucide-react";

interface ProfessorSession {
  id: string;
  nome: string;
  email: string | null;
  user_id: string;
}

export const ProfessorPortal = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profSession, setProfSession] = useState<ProfessorSession | null>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginSenha, setLoginSenha] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showContestar, setShowContestar] = useState(false);
  const [contestacao, setContestacao] = useState("");

  // Login professor
  const handleLogin = async () => {
    if (!loginEmail || !loginSenha || !user?.id) return;
    setLoggingIn(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-professor-login", {
        body: { email: loginEmail, senha: loginSenha },
      });
      if (error || !data?.professor) {
        toast.error("Credenciais inválidas");
        return;
      }
      const p = data.professor;
      setProfSession({ id: p.id, nome: p.nome, email: p.email, user_id: p.user_id });
      toast.success(`Bem-vindo, ${p.nome}!`);
    } catch {
      toast.error("Erro ao autenticar");
    } finally {
      setLoggingIn(false);
    }
  };

  // Fetch folha status for professor
  const { data: folhaStatus } = useQuery({
    queryKey: ["professor-folha-status", profSession?.user_id],
    queryFn: async () => {
      if (!profSession) return [];
      const { data } = await supabase
        .from("folha_fechamento")
        .select("*")
        .eq("user_id", profSession.user_id)
        .order("mes_referencia", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!profSession,
  });

  // Fetch professor's cronograma for payslip
  const { data: cronogramaProf } = useQuery({
    queryKey: ["professor-cronograma", profSession?.id],
    queryFn: async () => {
      if (!profSession) return [];
      const { data } = await supabase
        .from("cronograma_mestre")
        .select(`id, data_aula, hora_inicio, hora_fim, valor_calculado, status_aula, turma:turmas(nome), disciplina:cad_disciplinas(nome)`)
        .eq("professor_id", profSession.id)
        .in("status_aula", ["Realizada", "Confirmada", "Agendada"])
        .order("data_aula", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
    enabled: !!profSession,
  });

  // Fetch contestações
  const { data: contestacoes } = useQuery({
    queryKey: ["professor-contestacoes", profSession?.id],
    queryFn: async () => {
      if (!profSession) return [];
      const { data } = await supabase
        .from("contestacoes")
        .select("*")
        .eq("professor_id", profSession.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!profSession,
  });

  // Submit contestação
  const submitContestacao = useMutation({
    mutationFn: async () => {
      if (!profSession || !contestacao) return;
      const mesRef = new Date().toISOString().slice(0, 7) + "-01";
      const { error } = await supabase.from("contestacoes").insert({
        user_id: profSession.user_id,
        professor_id: profSession.id,
        mes_referencia: mesRef,
        descricao: contestacao,
        status: "aberta",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professor-contestacoes"] });
      toast.success("Contestação enviada com sucesso");
      setShowContestar(false);
      setContestacao("");
    },
    onError: () => toast.error("Erro ao enviar contestação"),
  });

  // Calculate totals from cronograma
  const totalHoras = (cronogramaProf || []).reduce((s, a) => {
    const [hi, mi] = (a.hora_inicio || "08:00").split(":").map(Number);
    const [hf, mf] = (a.hora_fim || "12:00").split(":").map(Number);
    return s + ((hf + mf / 60) - (hi + mi / 60));
  }, 0);
  const totalValor = (cronogramaProf || []).reduce((s, a) => s + Number(a.valor_calculado || 0), 0);

  // LOGIN SCREEN
  if (!profSession) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="text-xl">Portal do Professor</CardTitle>
            <p className="text-sm text-muted-foreground">Acesse seus contracheques e informações</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="seu.email@exemplo.com" />
            </div>
            <div>
              <Label>Senha</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={loginSenha} onChange={(e) => setLoginSenha(e.target.value)} placeholder="Sua senha" />
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Formato padrão: PrimeiroNome + AnoDeNascimento</p>
            </div>
            <Button className="w-full" onClick={handleLogin} disabled={loggingIn || !loginEmail || !loginSenha}>
              {loggingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
              {loggingIn ? "Verificando..." : "Acessar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // DASHBOARD
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Olá, {profSession.nome.split(" ")[0]}!</h2>
          <p className="text-sm text-muted-foreground">{profSession.email}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setProfSession(null)}>Sair</Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Horas Registradas</p>
          <p className="text-2xl font-bold mt-1">{totalHoras.toFixed(0)}h</p>
        </CardContent></Card>
        <Card className="border-none shadow-sm"><CardContent className="p-4">
          <p className="text-xs text-muted-foreground uppercase">Valor Estimado</p>
          <p className="text-2xl font-bold text-primary mt-1">{fmt(totalValor)}</p>
        </CardContent></Card>
      </div>

      {/* Folha Status Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Status da Folha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(folhaStatus || []).length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" /> <span>Nenhuma folha processada ainda</span>
            </div>
          ) : (folhaStatus || []).map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
              <span className="text-sm font-medium">{new Date(f.mes_referencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
              <Badge variant={f.status === "fechada" ? "default" : "secondary"} className="gap-1 text-xs">
                {f.status === "fechada" ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                {f.status === "fechada" ? "Disponível" : "Processando"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent Aulas */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Aulas Recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {(cronogramaProf || []).slice(0, 10).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm">
              <div>
                <span className="font-medium">{a.disciplina?.nome || "—"}</span>
                <span className="text-muted-foreground"> · {a.turma?.nome || "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{new Date(a.data_aula).toLocaleDateString("pt-BR")}</span>
                <Badge variant={a.status_aula === "Realizada" ? "default" : "secondary"} className="text-xs">{a.status_aula}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contestações */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <CardTitle className="text-sm">Contestações</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowContestar(true)} className="gap-1.5">
            <MessageSquareWarning className="w-4 h-4" /> Contestar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {(contestacoes || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma contestação registrada</p>
          ) : (contestacoes || []).map((c: any) => (
            <div key={c.id} className="p-3 rounded-lg bg-muted/30 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                <Badge variant={c.status === "aberta" ? "secondary" : c.status === "resolvida" ? "default" : "destructive"} className="text-xs">{c.status}</Badge>
              </div>
              <p className="text-sm">{c.descricao}</p>
              {c.resposta && <p className="text-sm text-primary mt-1">↳ {c.resposta}</p>}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contestação Dialog */}
      <Dialog open={showContestar} onOpenChange={setShowContestar}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquareWarning className="w-5 h-5" /> Solicitar Revisão</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Descreva a divergência encontrada em horas ou valores. A ADM e Direção serão notificados automaticamente.</p>
            <Textarea value={contestacao} onChange={(e) => setContestacao(e.target.value)} placeholder="Ex: As horas registradas em maio para a disciplina de Enfermagem estão incorretas..." rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowContestar(false)}>Cancelar</Button>
            <Button onClick={() => submitContestacao.mutate()} disabled={!contestacao || submitContestacao.isPending}>Enviar Contestação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
