import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Professor } from "@/hooks/useProfessores";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Mail, Phone, GraduationCap, Briefcase, User, CalendarDays, Clock, MapPin, FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProfessorProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor: Professor | null;
}

interface AulaRecord {
  id: string;
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  turma_nome: string;
  disciplina_nome: string;
  status_aula: string | null;
}

export const ProfessorProfileDialog = ({ open, onOpenChange, professor }: ProfessorProfileDialogProps) => {
  const { user } = useAuth();
  const [aulas, setAulas] = useState<AulaRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    if (open && professor && user) fetchAulas();
  }, [open, professor, user]);

  const fetchAulas = async () => {
    if (!professor || !user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          id, data_aula, hora_inicio, hora_fim, status_aula,
          turma:turmas(nome),
          disciplina:cad_disciplinas(nome)
        `)
        .eq("user_id", user.id)
        .eq("professor_id", professor.id)
        .order("data_aula", { ascending: true });

      if (error) throw error;
      setAulas(
        (data || []).map((a: any) => ({
          id: a.id,
          data_aula: a.data_aula,
          hora_inicio: a.hora_inicio,
          hora_fim: a.hora_fim,
          turma_nome: a.turma?.nome || "—",
          disciplina_nome: a.disciplina?.nome || "—",
          status_aula: a.status_aula,
        }))
      );
    } catch (err) {
      console.error("Error fetching professor aulas:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const aulaDates = aulas.map((a) => parseISO(a.data_aula));

  const aulasDoMes = aulas.filter((a) => {
    const d = parseISO(a.data_aula);
    return d.getMonth() === calendarMonth.getMonth() && d.getFullYear() === calendarMonth.getFullYear();
  });

  const totalHoras = aulas.reduce((sum, a) => {
    try {
      const [h1, m1] = a.hora_inicio.split(":").map(Number);
      const [h2, m2] = a.hora_fim.split(":").map(Number);
      return sum + (h2 * 60 + m2 - h1 * 60 - m1) / 60;
    } catch { return sum; }
  }, 0);

  const turmasUnicas = [...new Set(aulas.map((a) => a.turma_nome))];

  const handleExportPDF = () => {
    if (!professor) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Perfil - ${professor.nome}</title>
      <style>body{font-family:Arial;padding:20px;font-size:12px}h1{font-size:18px}h2{font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:20px}
      table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f0f0f0}</style></head><body>
      <h1>${professor.nome}</h1>
      <p><strong>Função:</strong> ${professor.funcao || "—"} | <strong>Status:</strong> ${professor.status || "Ativo"} | <strong>Coren:</strong> ${professor.coren || "—"}</p>
      <p><strong>Email:</strong> ${professor.email || "—"} | <strong>Telefone:</strong> ${professor.telefone || "—"}</p>
      <p><strong>Formação:</strong> ${professor.formacao || "—"} | <strong>Especialidade:</strong> ${professor.especialidade || "—"}</p>
      <p><strong>Total de Aulas:</strong> ${aulas.length} | <strong>Total de Horas:</strong> ${Math.round(totalHoras)}h | <strong>Turmas:</strong> ${turmasUnicas.join(", ") || "—"}</p>
      <h2>Histórico de Aulas</h2><table><tr><th>Data</th><th>Turma</th><th>Disciplina</th><th>Horário</th><th>Status</th></tr>`);
    aulas.forEach((a) => {
      w.document.write(`<tr><td>${format(parseISO(a.data_aula), "dd/MM/yyyy")}</td><td>${a.turma_nome}</td><td>${a.disciplina_nome}</td>
        <td>${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)}</td><td>${a.status_aula || "Agendada"}</td></tr>`);
    });
    w.document.write("</table></body></html>");
    w.document.close();
    w.print();
  };

  if (!professor) return null;

  const disciplinas = professor.disciplinas_lecionar
    ? professor.disciplinas_lecionar.split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-xl font-semibold text-primary">
                {professor.nome.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <span className="block">{professor.nome}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{professor.status || "Ativo"}</Badge>
                {professor.funcao && <Badge variant="secondary">{professor.funcao}</Badge>}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
              <FileDown className="w-4 h-4" /> PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <CalendarDays className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{aulas.length}</p>
                <p className="text-[10px] text-muted-foreground">Total Aulas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{Math.round(totalHoras)}h</p>
                <p className="text-[10px] text-muted-foreground">Horas Lecionadas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <User className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{turmasUnicas.length}</p>
                <p className="text-[10px] text-muted-foreground">Turmas</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <GraduationCap className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{disciplinas.length}</p>
                <p className="text-[10px] text-muted-foreground">Disciplinas</p>
              </div>
            </div>

            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {professor.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> {professor.email}
                </div>
              )}
              {professor.telefone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {professor.telefone}
                </div>
              )}
              {professor.formacao && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5" /> {professor.formacao}
                </div>
              )}
              {professor.especialidade && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GraduationCap className="w-3.5 h-3.5" /> {professor.especialidade}
                </div>
              )}
              {professor.endereco && (
                <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                  <MapPin className="w-3.5 h-3.5" /> {professor.endereco}
                </div>
              )}
            </div>

            {/* Disciplinas */}
            {disciplinas.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">Disciplinas:</span>
                {disciplinas.map((d) => (
                  <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                ))}
              </div>
            )}

            {/* Calendar + Aulas do mês */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Agenda</h3>
                <Calendar
                  mode="multiple"
                  selected={aulaDates}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  locale={ptBR}
                  modifiers={{ aula: aulaDates }}
                  modifiersClassNames={{ aula: "!bg-primary/20 !text-primary font-bold" }}
                  className="rounded-md border"
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Aulas de {format(calendarMonth, "MMMM yyyy", { locale: ptBR })} ({aulasDoMes.length})
                </h3>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {aulasDoMes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sem aulas neste mês</p>
                  ) : (
                    aulasDoMes.map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2 text-xs">
                        <div>
                          <span className="font-medium text-foreground">
                            {format(parseISO(a.data_aula), "dd/MM")} • {a.hora_inicio.slice(0, 5)}-{a.hora_fim.slice(0, 5)}
                          </span>
                          <p className="text-muted-foreground">{a.turma_nome} — {a.disciplina_nome}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px]">{a.status_aula || "Agendada"}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
