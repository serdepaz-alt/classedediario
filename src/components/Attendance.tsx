import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { format, isBefore, isAfter, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Calendar as CalendarIcon,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  BookOpen,
  GraduationCap,
  Video,
  Info,
  MapPin,
  Lock,
  Sparkles,
} from "lucide-react";
import { AddDisciplinaDialog } from "./attendance/AddDisciplinaDialog";
import { DisciplinaDetailsDialog } from "./attendance/DisciplinaDetailsDialog";
import { EditDisciplinaDialog } from "./attendance/EditDisciplinaDialog";
import { TurmaAttendanceCard } from "./attendance/TurmaAttendanceCard";

interface Disciplina {
  id: string;
  nome: string;
  turno: string;
  curso: string;
  data_inicio: string;
  data_termino: string;
  carga_horaria_diaria: number;
  carga_horaria_total: number | null;
  dias_uteis: number | null;
  dias_subtraidos: number | null;
  nome_professor: string | null;
  turma_id: string | null;
  turmas?: { nome: string } | null;
}

interface Student {
  id: string;
  nome: string;
  matricula: string;
  email?: string | null;
}

interface StudentAtRisk {
  name: string;
  percentage: number;
  absences: number;
}

interface TurmaGroup {
  turmaId: string;
  turmaNome: string;
  turno: string;
  curso: string;
  disciplinas: Disciplina[];
  disciplinaAtual: Disciplina | null;
  chamadaFeita?: boolean;
}

interface ActiveAula {
  id: string;
  turma_id: string | null;
  disciplina_id: string | null;
  professor_id: string | null;
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  turma?: { id: string; nome: string; curso: string | null } | null;
  professor?: { id: string; nome: string } | null;
  disciplina_cad?: { id: string; nome: string } | null;
}

export const Attendance = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [presencas, setPresencas] = useState<Map<string, string>>(new Map());
  const [showAddDisciplina, setShowAddDisciplina] = useState(false);
  const [showDisciplinaDetails, setShowDisciplinaDetails] = useState(false);
  const [showEditDisciplina, setShowEditDisciplina] = useState(false);
  const [sortOrder, setSortOrder] = useState("name-asc");
  const [isLoading, setIsLoading] = useState(false);
  const [studentsAtRisk, setStudentsAtRisk] = useState<StudentAtRisk[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [datesWithAttendance, setDatesWithAttendance] = useState<Set<string>>(new Set());
  const [todayAttendanceDone, setTodayAttendanceDone] = useState<Set<string>>(new Set());
  const [activeAula, setActiveAula] = useState<ActiveAula | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const classStartTimeRef = useRef<Date | null>(null);

  useEffect(() => {
    if (!classStartTimeRef.current) {
      classStartTimeRef.current = new Date();
    }
  }, []);

  // Live clock update every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Detect active aula from cronograma_mestre based on current date/time
  useEffect(() => {
    const detectActiveAula = async () => {
      if (!user) return;
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const nowTime = format(new Date(), "HH:mm:ss");

      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          id, turma_id, disciplina_id, professor_id, data_aula, hora_inicio, hora_fim,
          turma:turmas(id, nome, curso),
          professor:cad_professores(id, nome),
          disciplina_cad:cad_disciplinas(id, nome)
        `)
        .eq("user_id", user.id)
        .eq("data_aula", todayStr)
        .lte("hora_inicio", nowTime)
        .gte("hora_fim", nowTime)
        .limit(1);

      if (!error && data && data.length > 0) {
        setActiveAula(data[0] as unknown as ActiveAula);
      } else {
        // If no aula right now, try to find the next one today
        const { data: nextData } = await supabase
          .from("cronograma_mestre")
          .select(`
            id, turma_id, disciplina_id, professor_id, data_aula, hora_inicio, hora_fim,
            turma:turmas(id, nome, curso),
            professor:cad_professores(id, nome),
            disciplina_cad:cad_disciplinas(id, nome)
          `)
          .eq("user_id", user.id)
          .eq("data_aula", todayStr)
          .gte("hora_inicio", nowTime)
          .order("hora_inicio", { ascending: true })
          .limit(1);

        if (nextData && nextData.length > 0) {
          setActiveAula(nextData[0] as unknown as ActiveAula);
        } else {
          setActiveAula(null);
        }
      }
    };

    detectActiveAula();
  }, [user, currentTime]);

  // Group disciplines by turma and detect current discipline per turma
  const turmaGroups = useMemo((): TurmaGroup[] => {
    const today = startOfDay(new Date());
    const grouped = new Map<string, TurmaGroup>();

    disciplinas.forEach((d) => {
      if (!d.turma_id) return;
      const key = d.turma_id;

      if (!grouped.has(key)) {
        grouped.set(key, {
          turmaId: d.turma_id,
          turmaNome: d.turmas?.nome || "Turma",
          turno: d.turno,
          curso: d.curso,
          disciplinas: [],
          disciplinaAtual: null,
          chamadaFeita: todayAttendanceDone.has(d.turma_id),
        });
      }

      const group = grouped.get(key)!;
      group.disciplinas.push(d);

      // Check if this discipline is current (date range covers today)
      const startDate = startOfDay(new Date(d.data_inicio));
      const endDate = startOfDay(new Date(d.data_termino));
      if (!isAfter(startDate, today) && !isBefore(endDate, today)) {
        group.disciplinaAtual = d;
      }
    });

    // Sort: turmas with active discipline first, then by name
    return Array.from(grouped.values()).sort((a, b) => {
      if (a.disciplinaAtual && !b.disciplinaAtual) return -1;
      if (!a.disciplinaAtual && b.disciplinaAtual) return 1;
      return a.turmaNome.localeCompare(b.turmaNome);
    });
  }, [disciplinas, todayAttendanceDone]);

  // Auto-select turma from active aula detection or fallback to discipline-based
  useEffect(() => {
    if (turmaGroups.length > 0 && !selectedTurmaId) {
      // Priority: match from cronograma_mestre active aula
      if (activeAula?.turma_id) {
        const matchingTurma = turmaGroups.find((t) => t.turmaId === activeAula.turma_id);
        if (matchingTurma) {
          setSelectedTurmaId(matchingTurma.turmaId);
          if (matchingTurma.disciplinaAtual) {
            setSelectedDisciplina(matchingTurma.disciplinaAtual);
          }
          return;
        }
      }
      // Fallback: first turma with active discipline
      const active = turmaGroups.find((t) => t.disciplinaAtual);
      if (active) {
        setSelectedTurmaId(active.turmaId);
        setSelectedDisciplina(active.disciplinaAtual);
      }
    }
  }, [turmaGroups, selectedTurmaId, activeAula]);

  // Fetch disciplinas
  useEffect(() => {
    const fetchDisciplinas = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from("disciplinas")
        .select("*, turmas (nome)")
        .eq("user_id", user.id);

      if (!error && data) {
        setDisciplinas(data);
      }
    };

    fetchDisciplinas();
  }, [user]);

  // Check which turmas already have attendance today
  useEffect(() => {
    const checkTodayAttendance = async () => {
      if (!user || !selectedDate) return;
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { data } = await supabase
        .from("presencas")
        .select("disciplina_id")
        .eq("user_id", user.id)
        .eq("data", dateStr);

      if (data && data.length > 0) {
        const discIds = new Set(data.map((p) => p.disciplina_id).filter(Boolean));
        const turmasDone = new Set<string>();
        disciplinas.forEach((d) => {
          if (d.turma_id && discIds.has(d.id)) {
            turmasDone.add(d.turma_id);
          }
        });
        setTodayAttendanceDone(turmasDone);
      } else {
        setTodayAttendanceDone(new Set());
      }
    };

    checkTodayAttendance();
  }, [user, selectedDate, disciplinas]);

  // Fetch students when disciplina changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user || !selectedDisciplina || !selectedDisciplina.turma_id) {
        setStudents([]);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select("id, nome, matricula, email")
        .eq("user_id", user.id)
        .eq("turma_id", selectedDisciplina.turma_id)
        .eq("status", "Ativo")
        .order("nome", { ascending: true });

      if (!error && data) {
        setStudents(data);
        const initialPresencas = new Map<string, string>();
        data.forEach((s) => initialPresencas.set(s.id, "presente"));
        setPresencas(initialPresencas);
      }
    };

    fetchStudents();
  }, [user, selectedDisciplina]);

  // Fetch presencas for selected date
  useEffect(() => {
    const fetchPresencas = async () => {
      if (!user || !selectedDisciplina || !selectedDate) return;

      const { data, error } = await supabase
        .from("presencas")
        .select("*")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id)
        .eq("data", format(selectedDate, "yyyy-MM-dd"));

      if (!error && data) {
        if (data.length > 0) {
          const presencaMap = new Map<string, string>();
          students.forEach((s) => presencaMap.set(s.id, "presente"));
          data.forEach((p) => {
            if (p.student_id) presencaMap.set(p.student_id, p.status);
          });
          setPresencas(presencaMap);
        } else {
          const newMap = new Map<string, string>();
          students.forEach((s) => newMap.set(s.id, "presente"));
          setPresencas(newMap);
        }
      }
    };

    fetchPresencas();
  }, [user, selectedDisciplina, selectedDate, students]);

  // Fetch dates with attendance for calendar
  useEffect(() => {
    const fetchAttendanceDates = async () => {
      if (!user || !selectedDisciplina) return;

      const { data } = await supabase
        .from("presencas")
        .select("data")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      if (data) {
        setDatesWithAttendance(new Set(data.map((p) => p.data)));
      }
    };

    fetchAttendanceDates();
  }, [user, selectedDisciplina]);

  // Fetch students at risk
  useEffect(() => {
    const fetchStudentsAtRisk = async () => {
      if (!user || !selectedDisciplina) return;

      const { data } = await supabase
        .from("presencas")
        .select("student_id, status")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      if (data && students.length > 0) {
        const studentStats = new Map<string, { absences: number; total: number }>();

        data.forEach((p) => {
          if (p.student_id) {
            const current = studentStats.get(p.student_id) || { absences: 0, total: 0 };
            current.total++;
            if (p.status === "ausente" || p.status === "atrasado") current.absences++;
            studentStats.set(p.student_id, current);
          }
        });

        const atRisk: StudentAtRisk[] = [];
        studentStats.forEach((stats, studentId) => {
          const student = students.find((s) => s.id === studentId);
          if (student && stats.absences >= 2) {
            const percentage = Math.round(((stats.total - stats.absences) / stats.total) * 100);
            atRisk.push({ name: student.nome, percentage, absences: stats.absences });
          }
        });

        setStudentsAtRisk(atRisk.sort((a, b) => a.percentage - b.percentage).slice(0, 5));
      }
    };

    fetchStudentsAtRisk();
  }, [user, selectedDisciplina, students]);

  const refreshDisciplinas = async () => {
    if (!user) return;
    const { data } = await supabase.from("disciplinas").select("*, turmas (nome)").eq("user_id", user.id);
    if (data) {
      setDisciplinas(data);
      if (selectedDisciplina) {
        const updated = data.find((d) => d.id === selectedDisciplina.id);
        if (updated) setSelectedDisciplina(updated);
      }
    }
  };

  const handleSelectTurma = (turma: TurmaGroup) => {
    setSelectedTurmaId(turma.turmaId);
    if (turma.disciplinaAtual) {
      setSelectedDisciplina(turma.disciplinaAtual);
    }
  };

  const setStatus = (studentId: string, status: string) => {
    setPresencas(new Map(presencas.set(studentId, status)));
  };

  const markAllPresent = () => {
    const newPresencas = new Map<string, string>();
    students.forEach((s) => newPresencas.set(s.id, "presente"));
    setPresencas(newPresencas);
    toast.success("Todos marcados como presentes");
  };

  const handleSaveClick = () => {
    setShowConfirmDialog(true);
  };

  const saveAttendance = async () => {
    if (!user || !selectedDisciplina || !selectedDate) return;

    setIsLoading(true);
    setShowConfirmDialog(false);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const saveTime = new Date().toISOString();
      const startTime = classStartTimeRef.current?.toISOString() || saveTime;

      await supabase
        .from("presencas")
        .delete()
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id)
        .eq("data", dateStr);

      const records = Array.from(presencas.entries())
        .filter(([_, status]) => status !== "pending")
        .map(([studentId, status]) => ({
          user_id: user.id,
          disciplina_id: selectedDisciplina.id,
          student_id: studentId,
          data: dateStr,
          status,
          horario_inicio: startTime,
          horario_salvamento: saveTime,
        }));

      if (records.length > 0) {
        const { error } = await supabase.from("presencas").insert(records);
        if (error) throw error;
      }

      setDatesWithAttendance((prev) => new Set([...prev, dateStr]));

      // Mark turma as done for today
      if (selectedDisciplina.turma_id) {
        setTodayAttendanceDone((prev) => new Set([...prev, selectedDisciplina.turma_id!]));
      }

      toast.success("Chamada salva com sucesso!");

      // Send notifications for students with issues
      const { data: allPresencas } = await supabase
        .from("presencas")
        .select("student_id, status")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      if (allPresencas) {
        const studentStats = new Map<string, { absences: number; lates: number }>();
        allPresencas.forEach((p) => {
          if (p.student_id) {
            const current = studentStats.get(p.student_id) || { absences: 0, lates: 0 };
            if (p.status === "ausente") current.absences++;
            if (p.status === "atrasado") current.lates++;
            studentStats.set(p.student_id, current);
          }
        });

        const studentsWithIssues = students
          .filter((s) => {
            const stats = studentStats.get(s.id);
            return stats && stats.absences + stats.lates >= 2;
          })
          .map((s) => {
            const stats = studentStats.get(s.id)!;
            return {
              student_id: s.id,
              student_name: s.nome,
              student_email: s.email || null,
              total_absences: stats.absences,
              total_lates: stats.lates,
              status: presencas.get(s.id) || "pending",
            };
          });

        const studentsPresent = students
          .filter((s) => presencas.get(s.id) === "presente")
          .map((s) => ({ student_id: s.id, student_name: s.nome, student_email: s.email || null }));

        if (studentsWithIssues.length > 0 || studentsPresent.length > 0) {
          try {
            await supabase.functions.invoke("send-attendance-notifications", {
              body: {
                disciplina_id: selectedDisciplina.id,
                disciplina_nome: selectedDisciplina.nome,
                data: dateStr,
                admin_email: user.email || "",
                students_with_issues: studentsWithIssues,
                students_present: studentsPresent,
              },
            });
          } catch {
            console.log("Notificações não configuradas");
          }
        }
      }

      classStartTimeRef.current = new Date();
    } catch (error: any) {
      toast.error("Erro ao salvar chamada: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const todayStats = {
    present: Array.from(presencas.values()).filter((s) => s === "presente").length,
    absent: Array.from(presencas.values()).filter((s) => s === "ausente").length,
    late: Array.from(presencas.values()).filter((s) => s === "atrasado").length,
    total: students.length || 1,
  };

  const markedCount = Array.from(presencas.values()).filter((s) => s !== "pending").length;
  const progressPercent = students.length > 0 ? Math.round((markedCount / students.length) * 100) : 0;

  const sortedStudents = [...students].sort((a, b) => {
    if (sortOrder === "name-asc") return a.nome.localeCompare(b.nome);
    if (sortOrder === "name-desc") return b.nome.localeCompare(a.nome);
    return 0;
  });

  const filteredStudents = sortedStudents.filter((s) =>
    s.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  };

  const calendarModifiers = {
    hasAttendance: (date: Date) => datesWithAttendance.has(format(date, "yyyy-MM-dd")),
  };

  const calendarModifiersStyles = {
    hasAttendance: {
      backgroundColor: "hsl(var(--primary) / 0.15)",
      borderRadius: "50%",
      fontWeight: "bold" as const,
    },
  };

  const selectedTurmaGroup = turmaGroups.find((t) => t.turmaId === selectedTurmaId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Presença</h1>
          <p className="text-muted-foreground">
            {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs py-1 px-3">
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            {format(currentTime, "HH:mm")}
          </Badge>
          {selectedDisciplina && (
            <Badge variant="secondary" className="text-sm py-1 px-3">
              <BookOpen className="w-3.5 h-3.5 mr-1.5" />
              {selectedDisciplina.nome}
            </Badge>
          )}
        </div>
      </div>

      {/* Active Aula Alert Banner */}
      {activeAula && (
        <Alert className="border-primary/30 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary font-semibold">
            Chamada em Andamento — {format(currentTime, "dd/MM/yyyy")} às {format(currentTime, "HH:mm")}
          </AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground">
              {activeAula.turma && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                  <strong>Turma:</strong> {activeAula.turma.nome}
                  {activeAula.turma.curso && ` (${activeAula.turma.curso})`}
                </span>
              )}
              {activeAula.disciplina_cad && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                  <strong>Disciplina:</strong> {activeAula.disciplina_cad.nome}
                </span>
              )}
              {activeAula.professor && (
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <strong>Professor:</strong> {activeAula.professor.nome}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <strong>Horário:</strong> {activeAula.hora_inicio.slice(0, 5)} - {activeAula.hora_fim.slice(0, 5)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Video className="w-3.5 h-3.5" />
              <span>Dupla checagem disponível: conferência de presença por câmeras pode ser utilizada como verificação complementar.</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!activeAula && (
        <Alert className="border-muted-foreground/20 bg-muted/30">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <AlertTitle className="text-foreground font-semibold">
            {format(currentTime, "dd/MM/yyyy")} — {format(currentTime, "HH:mm")}
          </AlertTitle>
          <AlertDescription className="text-muted-foreground text-sm">
            Nenhuma aula agendada no cronograma para este horário. Selecione uma turma abaixo para registrar presença manualmente.
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <Video className="w-3.5 h-3.5" />
              <span>Conferência por câmeras disponível como dupla checagem.</span>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Turma Cards - Smart Detection */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-foreground">Suas Turmas Hoje</h2>
          <Badge variant="outline" className="text-xs">
            {turmaGroups.filter((t) => t.disciplinaAtual).length} ativas
          </Badge>
        </div>

        {turmaGroups.length === 0 ? (
          <Card className="p-8 text-center">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">Nenhuma turma com disciplinas cadastradas.</p>
            <Button variant="outline" className="mt-3" onClick={() => setShowAddDisciplina(true)}>
              Adicionar Disciplina
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {turmaGroups.map((turma) => (
              <TurmaAttendanceCard
                key={turma.turmaId}
                turma={turma}
                isSelected={selectedTurmaId === turma.turmaId}
                onSelect={handleSelectTurma}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {selectedDisciplina && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 gradient-card shadow-card border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{todayStats.present}</p>
                <p className="text-xs text-muted-foreground">Presentes</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 gradient-card shadow-card border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{todayStats.absent}</p>
                <p className="text-xs text-muted-foreground">Ausentes</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 gradient-card shadow-card border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{todayStats.late}</p>
                <p className="text-xs text-muted-foreground">Atrasados</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 gradient-card shadow-card border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">
                  {Math.round((todayStats.present / todayStats.total) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">Frequência</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {selectedDisciplina && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-2">
            <Card className="gradient-card shadow-card border-0">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-foreground">Lista de Chamada</h3>
                    <Badge variant="outline" className="text-xs">
                      {selectedTurmaGroup?.turmaNome}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno por nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <Progress value={progressPercent} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {markedCount}/{students.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      {searchQuery ? (
                        <p>Nenhum aluno encontrado para "{searchQuery}".</p>
                      ) : (
                        <>
                          <p>Nenhum estudante encontrado.</p>
                          <p className="text-sm">Adicione estudantes à turma na aba Estudantes.</p>
                        </>
                      )}
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      const status = presencas.get(student.id) || "presente";
                      return (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-background/50 hover:bg-background/80 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {getInitials(student.nome)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-sm text-foreground">{student.nome}</span>
                              <p className="text-[10px] text-muted-foreground">{student.matricula}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setStatus(student.id, "presente")}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                status === "presente"
                                  ? "bg-green-500 text-white shadow-md"
                                  : "bg-green-100 text-green-700 hover:bg-green-200"
                              }`}
                              title="Presente"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">P</span>
                            </button>
                            <button
                              onClick={() => setStatus(student.id, "ausente")}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                status === "ausente"
                                  ? "bg-red-500 text-white shadow-md"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              }`}
                              title="Ausente"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">F</span>
                            </button>
                            <button
                              onClick={() => setStatus(student.id, "atrasado")}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                                status === "atrasado"
                                  ? "bg-yellow-500 text-white shadow-md"
                                  : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              }`}
                              title="Atrasado"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">A</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {filteredStudents.length > 0 && (
                  <div className="flex gap-3 mt-4 pt-4 border-t">
                    <Button variant="outline" className="flex-1" size="sm" onClick={markAllPresent}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Todos Presentes
                    </Button>
                    <Button className="flex-1" size="sm" onClick={handleSaveClick} disabled={isLoading}>
                      {isLoading ? "Salvando..." : "Salvar Chamada"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Calendar */}
            <Card className="p-4 gradient-card shadow-card border-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Calendário</h3>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/20" />
                  Chamada feita
                </div>
              </div>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="rounded-md border-0 pointer-events-auto"
                modifiers={calendarModifiers}
                modifiersStyles={calendarModifiersStyles}
              />
            </Card>

            {/* Discipline Info */}
            {selectedDisciplina && (
              <Card className="p-4 gradient-card shadow-card border-0">
                <h3 className="font-semibold text-foreground text-sm mb-3">Disciplina Atual</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disciplina</span>
                    <span className="font-medium text-foreground">{selectedDisciplina.nome}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Professor</span>
                    <span className="font-medium text-foreground">{selectedDisciplina.nome_professor || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Período</span>
                    <span className="font-medium text-foreground">
                      {format(new Date(selectedDisciplina.data_inicio), "dd/MM")} - {format(new Date(selectedDisciplina.data_termino), "dd/MM")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">CH Diária</span>
                    <span className="font-medium text-foreground">{selectedDisciplina.carga_horaria_diaria}min</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowDisciplinaDetails(true)}
                  >
                    Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowEditDisciplina(true)}
                  >
                    Editar
                  </Button>
                </div>
              </Card>
            )}

            {/* Students at Risk */}
            <Card className="p-4 gradient-card shadow-card border-0">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-foreground text-sm">Alunos de Risco</h3>
              </div>
              {studentsAtRisk.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum aluno em risco.</p>
              ) : (
                <ul className="space-y-1.5 text-xs">
                  {studentsAtRisk.map((student, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <span className="text-yellow-500">•</span>
                      <span className="text-foreground">
                        {student.name} ({student.percentage}% - {student.absences}F)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Confirm Save Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Chamada</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Confirma o registro para{" "}
                  <strong>
                    {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                  </strong>
                  {" — "}
                  <strong>{selectedDisciplina?.nome}</strong>
                  {selectedTurmaGroup && <> ({selectedTurmaGroup.turmaNome})</>}?
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-2xl font-bold text-green-600">{todayStats.present}</p>
                    <p className="text-xs text-green-700">Presentes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-2xl font-bold text-red-600">{todayStats.absent}</p>
                    <p className="text-xs text-red-700">Ausentes</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-600">{todayStats.late}</p>
                    <p className="text-xs text-yellow-700">Atrasados</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Frequência: <strong>{Math.round((todayStats.present / todayStats.total) * 100)}%</strong> ({todayStats.present}/{students.length})
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={saveAttendance}>Confirmar e Salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <AddDisciplinaDialog open={showAddDisciplina} onOpenChange={setShowAddDisciplina} onSuccess={refreshDisciplinas} />
      <DisciplinaDetailsDialog open={showDisciplinaDetails} onOpenChange={setShowDisciplinaDetails} disciplina={selectedDisciplina} />
      <EditDisciplinaDialog open={showEditDisciplina} onOpenChange={setShowEditDisciplina} disciplina={selectedDisciplina} onSuccess={refreshDisciplinas} />
    </div>
  );
};
