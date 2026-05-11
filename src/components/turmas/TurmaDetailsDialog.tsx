import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, BookOpen, Calendar, Clock, GraduationCap, FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TurmaDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string | null;
}

interface Student {
  id: string;
  nome: string;
  matricula: string;
  status: string | null;
}

interface Disciplina {
  id: string;
  nome: string;
  data_inicio: string;
  data_termino: string;
  nome_professor: string | null;
}

interface StudentMedia {
  student_id: string;
  disciplina_id: string;
  media_final: number | null;
  situacao: string | null;
}

interface StudentPresenca {
  student_id: string;
  total: number;
  presentes: number;
}

export const TurmaDetailsDialog = ({
  open,
  onOpenChange,
  turmaId,
}: TurmaDetailsDialogProps) => {
  const { user } = useAuth();
  const [turma, setTurma] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [medias, setMedias] = useState<StudentMedia[]>([]);
  const [presencas, setPresencas] = useState<StudentPresenca[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && turmaId && user) {
      fetchTurmaDetails();
    }
  }, [open, turmaId, user]);

  const fetchTurmaDetails = async () => {
    if (!turmaId || !user) return;
    setIsLoading(true);
    try {
      const [turmaRes, studentsRes, discRes] = await Promise.all([
        supabase.from("turmas").select("*").eq("id", turmaId).eq("user_id", user.id).maybeSingle(),
        supabase.from("students").select("id, nome, matricula, status").eq("turma_id", turmaId).eq("user_id", user.id).order("nome"),
        supabase.from("disciplinas").select("id, nome, data_inicio, data_termino, nome_professor").eq("turma_id", turmaId).eq("user_id", user.id).order("data_inicio"),
      ]);

      if (turmaRes.error) throw turmaRes.error;
      setTurma(turmaRes.data);
      setStudents(studentsRes.data || []);
      setDisciplinas(discRes.data || []);

      const studentIds = (studentsRes.data || []).map((s) => s.id);
      const disciplinaIds = (discRes.data || []).map((d) => d.id);

      if (studentIds.length > 0) {
        const { data: mediasData } = await supabase
          .from("medias_alunos")
          .select("student_id, disciplina_id, media_final, situacao")
          .eq("user_id", user.id)
          .in("student_id", studentIds);
        setMedias(mediasData || []);

        // Fetch presencas filtered to this turma's disciplines only
        const presencasQuery = supabase
          .from("presencas")
          .select("student_id, status")
          .eq("user_id", user.id)
          .in("student_id", studentIds);

        if (disciplinaIds.length > 0) {
          presencasQuery.in("disciplina_id", disciplinaIds);
        }

        const { data: presencasRaw } = await presencasQuery;

        if (presencasRaw) {
          const map: Record<string, { total: number; presentes: number }> = {};
          for (const p of presencasRaw) {
            if (!p.student_id) continue;
            if (!map[p.student_id]) map[p.student_id] = { total: 0, presentes: 0 };
            map[p.student_id].total++;
            if (p.status === "presente") map[p.student_id].presentes++;
          }
          setPresencas(
            Object.entries(map).map(([student_id, v]) => ({ student_id, ...v }))
          );
        }
      }
    } catch (error) {
      console.error("Error fetching turma details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Ativa": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Inativa": return "bg-red-500/10 text-red-600 border-red-500/20";
      case "Aguardando": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "Concluída": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStudentMedia = (studentId: string) => {
    const studentMedias = medias.filter((m) => m.student_id === studentId);
    if (studentMedias.length === 0) return null;
    const avg = studentMedias.reduce((sum, m) => sum + (Number(m.media_final) || 0), 0) / studentMedias.length;
    return avg;
  };

  const getStudentFreq = (studentId: string) => {
    const p = presencas.find((pr) => pr.student_id === studentId);
    if (!p || p.total === 0) return null;
    return Math.round((p.presentes / p.total) * 100);
  };

  const getStudentSituacao = (studentId: string) => {
    const studentMedias = medias.filter((m) => m.student_id === studentId);
    if (studentMedias.length === 0) return "Em Andamento";
    const hasInProgress = studentMedias.some((m) => !m.situacao || m.situacao === "Em Andamento");
    if (hasInProgress) return "Em Andamento";
    const allApproved = studentMedias.every((m) => m.situacao === "Aprovado");
    return allApproved ? "Aprovado" : "Reprovado";
  };

  const getSituacaoColor = (sit: string) => {
    switch (sit) {
      case "Aprovado": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Reprovado": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");
  const completed = disciplinas.filter((d) => d.data_termino < today).length;
  const progressPercent = disciplinas.length > 0 ? Math.round((completed / disciplinas.length) * 100) : 0;

  const handleExportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html><head><title>Ficha - ${turma?.nome}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 14px; margin-top: 20px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
        th { background: #f0f0f0; font-weight: bold; }
        .info { display: flex; gap: 24px; margin: 8px 0; }
        .info span { font-size: 12px; }
      </style></head><body>
      <h1>${turma?.nome}</h1>
      <div class="info">
        <span><strong>Curso:</strong> ${turma?.curso || "—"}</span>
        <span><strong>Turno:</strong> ${turma?.periodo || "—"}</span>
        <span><strong>Horário:</strong> ${turma?.horario || "—"}</span>
        <span><strong>Ano:</strong> ${turma?.ano_letivo}</span>
        <span><strong>Status:</strong> ${turma?.status || "Ativa"}</span>
      </div>
      <p>Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
      
      <h2>Alunos (${students.length})</h2>
      <table>
        <tr><th>#</th><th>Nome do Aluno</th><th>Média</th><th>Frequência</th><th>Status</th></tr>
    `);

    students.forEach((s, i) => {
      const media = getStudentMedia(s.id);
      const freq = getStudentFreq(s.id);
      const statusAluno = s.status === "Inativo" ? "Inativo" : "Ativo";
      printWindow.document.write(`
        <tr>
          <td>${i + 1}</td><td>${s.nome}</td>
          <td>${media !== null ? media.toFixed(1) : "—"}</td>
          <td>${freq !== null ? freq + "%" : "—"}</td>
          <td>${statusAluno}</td>
        </tr>
      `);
    });

    // Deduplicate disciplinas by nome + data_inicio to avoid duplicates in report
    const seen = new Set<string>();
    const uniqueDisciplinas = disciplinas.filter((d) => {
      const key = `${d.nome}__${d.data_inicio}__${d.data_termino}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    printWindow.document.write(`</table><h2>Disciplinas (${uniqueDisciplinas.length})</h2><table>
      <tr><th>#</th><th>Disciplina</th><th>Professor</th><th>Início</th><th>Término</th><th>Status</th></tr>
    `);

    uniqueDisciplinas.forEach((d, i) => {
      const isPast = d.data_termino < today;
      let isCurrent = false;
      try { isCurrent = d.data_inicio <= today && d.data_termino >= today; } catch {}
      const status = isPast ? "Concluída" : isCurrent ? "Atual" : "Futura";
      printWindow.document.write(`
        <tr>
          <td>${i + 1}</td><td>${d.nome}</td><td>${d.nome_professor || "—"}</td>
          <td>${new Date(d.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")}</td>
          <td>${new Date(d.data_termino + "T00:00:00").toLocaleDateString("pt-BR")}</td>
          <td>${status}</td>
        </tr>
      `);
    });

    printWindow.document.write("</table></body></html>");
    printWindow.document.close();
    printWindow.print();
  };

  if (!turma && !isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <span className="block">{turma?.nome}</span>
              {turma?.curso && (
                <span className="text-sm font-normal text-muted-foreground">
                  {turma.curso}
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
              <FileDown className="w-4 h-4" />
              PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Calendar className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{turma?.ano_letivo}</p>
                <p className="text-[10px] text-muted-foreground">Ano Letivo</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Clock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-sm font-semibold text-foreground">{turma?.periodo || "—"}</p>
                <p className="text-[10px] text-muted-foreground">Turno</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Users className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-foreground">{students.length}</p>
                <p className="text-[10px] text-muted-foreground">Alunos</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <Badge className={getStatusColor(turma?.status)}>{turma?.status || "—"}</Badge>
                <p className="text-[10px] text-muted-foreground mt-1">Status</p>
              </div>
            </div>

            {/* Cronograma Progress */}
            {disciplinas.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">Progresso do Cronograma</span>
                  <span className="text-xs text-muted-foreground">{completed}/{disciplinas.length} ({progressPercent}%)</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Students Section - Academic Panel */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">
                  Painel Acadêmico ({students.length})
                </h3>
              </div>
              {students.length > 0 ? (
                <div className="bg-muted/30 rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                  {students.map((student) => {
                    const media = getStudentMedia(student.id);
                    const freq = getStudentFreq(student.id);
                    const sit = getStudentSituacao(student.id);
                    return (
                      <div key={student.id} className="flex items-center justify-between p-3 gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{student.nome}</p>
                          <p className="text-xs text-muted-foreground">Mat: {student.matricula}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs shrink-0">
                          <div className="text-center">
                            <p className="font-bold text-primary">{media !== null ? media.toFixed(1) : "—"}</p>
                            <p className="text-muted-foreground">Média</p>
                          </div>
                          <div className="text-center">
                            <p className="font-bold text-green-600">{freq !== null ? `${freq}%` : "—"}</p>
                            <p className="text-muted-foreground">Freq.</p>
                          </div>
                          <Badge variant="outline" className={`text-[10px] ${getSituacaoColor(sit)}`}>
                            {sit}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  Nenhum estudante cadastrado nesta turma.
                </p>
              )}
            </div>

            {/* Disciplinas Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">
                  Disciplinas ({disciplinas.length})
                </h3>
              </div>
              {disciplinas.length > 0 ? (
                <div className="bg-muted/30 rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {disciplinas.map((disciplina) => {
                    const isPast = disciplina.data_termino < today;
                    const isCurrent = disciplina.data_inicio <= today && disciplina.data_termino >= today;
                    return (
                      <div key={disciplina.id} className="flex items-center justify-between p-3">
                        <div>
                          <p className="font-medium text-foreground">{disciplina.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {disciplina.nome_professor && `Prof. ${disciplina.nome_professor} • `}
                            {new Date(disciplina.data_inicio + "T00:00:00").toLocaleDateString("pt-BR")} até{" "}
                            {new Date(disciplina.data_termino + "T00:00:00").toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            isPast
                              ? "bg-muted text-muted-foreground text-[10px]"
                              : isCurrent
                              ? "bg-primary/10 text-primary border-primary/20 text-[10px]"
                              : "text-[10px]"
                          }
                        >
                          {isPast ? "Concluída" : isCurrent ? "Atual" : "Futura"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  Nenhuma disciplina cadastrada para esta turma.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
