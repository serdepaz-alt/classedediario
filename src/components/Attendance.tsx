import { useState, useEffect, useMemo, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  LayoutGrid,
  Table as TableIcon,
  FileText,
  BarChart3,
  History,
} from "lucide-react";
import { AddDisciplinaDialog } from "./attendance/AddDisciplinaDialog";
import { DisciplinaDetailsDialog } from "./attendance/DisciplinaDetailsDialog";
import { EditDisciplinaDialog } from "./attendance/EditDisciplinaDialog";
import { TurmaAttendanceCard } from "./attendance/TurmaAttendanceCard";
import { StudentFrequencyHistory } from "./attendance/StudentFrequencyHistory";
import { AttendanceFrequencyChart } from "./attendance/AttendanceFrequencyChart";
import { AttendanceTableView } from "./attendance/AttendanceTableView";
import { AttendanceSaveSummary } from "./attendance/AttendanceSaveSummary";

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
  const [justificativas, setJustificativas] = useState<Map<string, string>>(new Map());
  const [showAddDisciplina, setShowAddDisciplina] = useState(false);
  const [showDisciplinaDetails, setShowDisciplinaDetails] = useState(false);
  const [showEditDisciplina, setShowEditDisciplina] = useState(false);
  const [sortOrder, setSortOrder] = useState("name-asc");
  const [isLoading, setIsLoading] = useState(false);
  const [studentsAtRisk, setStudentsAtRisk] = useState<StudentAtRisk[]>([]);
  const [studentsRiskMap, setStudentsRiskMap] = useState<Map<string, { absences: number; lates: number }>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [datesWithAttendance, setDatesWithAttendance] = useState<Set<string>>(new Set());
  const [todayAttendanceDone, setTodayAttendanceDone] = useState<Set<string>>(new Set());
  const [activeAula, setActiveAula] = useState<ActiveAula | null>(null);
  const [todayAulas, setTodayAulas] = useState<ActiveAula[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // New state for enhanced features
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [ocorrencias, setOcorrencias] = useState("");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<Student | null>(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [lastSaveStats, setLastSaveStats] = useState<{ present: number; absent: number; late: number; total: number } | null>(null);
  const [previousDayStats, setPreviousDayStats] = useState<{ present: number; absent: number; late: number; total: number } | null>(null);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<{ data: string; status: string }[]>([]);
  const [notificationsSent, setNotificationsSent] = useState(false);
  const [studentsWithIssuesCount, setStudentsWithIssuesCount] = useState(0);

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

  // Detect professor by matching logged-in user email to cad_professores
  const [professorMatch, setProfessorMatch] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    const findProfessor = async () => {
      if (!user?.email) return;
      const { data } = await supabase
        .from("cad_professores")
        .select("id, nome")
        .eq("user_id", user.id)
        .eq("email", user.email)
        .eq("status", "Ativo")
        .maybeSingle();
      setProfessorMatch(data || null);
    };
    findProfessor();
  }, [user]);

  // Detect active aula and fetch all today's aulas from cronograma_mestre
  useEffect(() => {
    const detectActiveAula = async () => {
      if (!user) return;
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const nowTime = format(new Date(), "HH:mm:ss");

      // Build query for today's aulas
      let query = supabase
        .from("cronograma_mestre")
        .select(`
          id, turma_id, disciplina_id, professor_id, data_aula, hora_inicio, hora_fim,
          turma:turmas(id, nome, curso),
          professor:cad_professores(id, nome, email),
          disciplina_cad:cad_disciplinas(id, nome)
        `)
        .eq("user_id", user.id)
        .eq("data_aula", todayStr)
        .order("hora_inicio", { ascending: true });

      // If professor match found, filter only aulas for this professor
      if (professorMatch) {
        query = query.eq("professor_id", professorMatch.id);
      }

      const { data: allToday } = await query;

      if (allToday) {
        setTodayAulas(allToday as unknown as ActiveAula[]);

        // Find current aula (within time range)
        const current = allToday.find(
          (a) => a.hora_inicio <= nowTime && a.hora_fim >= nowTime
        );
        if (current) {
          setActiveAula(current as unknown as ActiveAula);
        } else {
          // Next upcoming aula today
          const next = allToday.find((a) => a.hora_inicio >= nowTime);
          setActiveAula(next ? (next as unknown as ActiveAula) : null);
        }
      }
    };

    detectActiveAula();
  }, [user, currentTime, professorMatch]);

  // Group disciplines by turma, prioritize cronograma-scheduled turmas for today
  const turmaGroups = useMemo((): TurmaGroup[] => {
    const today = startOfDay(new Date());
    const grouped = new Map<string, TurmaGroup>();
    const nowTime = format(currentTime, "HH:mm:ss");

    // Build set of turma IDs scheduled today from cronograma
    const todayScheduledTurmaIds = new Set(
      todayAulas.map((a) => a.turma_id).filter(Boolean) as string[]
    );

    // Build a map of cronograma turma info for turmas not in disciplinas
    const cronogramaTurmaInfo = new Map<string, ActiveAula>();
    todayAulas.forEach((a) => {
      if (a.turma_id && !cronogramaTurmaInfo.has(a.turma_id)) {
        cronogramaTurmaInfo.set(a.turma_id, a);
      }
    });

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

    // Also create groups for cronograma turmas that have no disciplinas entries
    todayAulas.forEach((aula) => {
      if (aula.turma_id && !grouped.has(aula.turma_id) && aula.turma) {
        grouped.set(aula.turma_id, {
          turmaId: aula.turma_id,
          turmaNome: aula.turma.nome,
          turno: "",
          curso: aula.turma.curso || "",
          disciplinas: [],
          disciplinaAtual: null,
          chamadaFeita: todayAttendanceDone.has(aula.turma_id),
        });
      }
    });

    // Sort: cronograma-active turmas first (current time slot), then scheduled today, then others
    return Array.from(grouped.values()).sort((a, b) => {
      const aIsActiveNow = todayAulas.some(
        (au) => au.turma_id === a.turmaId && au.hora_inicio <= nowTime && au.hora_fim >= nowTime
      );
      const bIsActiveNow = todayAulas.some(
        (au) => au.turma_id === b.turmaId && au.hora_inicio <= nowTime && au.hora_fim >= nowTime
      );
      if (aIsActiveNow && !bIsActiveNow) return -1;
      if (!aIsActiveNow && bIsActiveNow) return 1;

      const aScheduled = todayScheduledTurmaIds.has(a.turmaId);
      const bScheduled = todayScheduledTurmaIds.has(b.turmaId);
      if (aScheduled && !bScheduled) return -1;
      if (!aScheduled && bScheduled) return 1;

      if (a.disciplinaAtual && !b.disciplinaAtual) return -1;
      if (!a.disciplinaAtual && b.disciplinaAtual) return 1;
      return a.turmaNome.localeCompare(b.turmaNome);
    });
  }, [disciplinas, todayAttendanceDone, todayAulas, currentTime]);

  // Auto-select turma from active aula detection or fallback to discipline-based
  useEffect(() => {
    if (turmaGroups.length > 0 && !selectedTurmaId) {
      const nowTime = format(currentTime, "HH:mm:ss");

      // Priority 1: Find turma with active cronograma slot RIGHT NOW
      const currentSlotAula = todayAulas.find(
        (a) => a.hora_inicio <= nowTime && a.hora_fim >= nowTime
      );
      if (currentSlotAula?.turma_id) {
        const matchingTurma = turmaGroups.find((t) => t.turmaId === currentSlotAula.turma_id);
        if (matchingTurma) {
          setSelectedTurmaId(matchingTurma.turmaId);
          if (matchingTurma.disciplinaAtual) {
            setSelectedDisciplina(matchingTurma.disciplinaAtual);
          }
          return;
        }
      }

      // Priority 2: match from activeAula (next upcoming)
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

      // Priority 3: first turma with active discipline
      const active = turmaGroups.find((t) => t.disciplinaAtual);
      if (active) {
        setSelectedTurmaId(active.turmaId);
        setSelectedDisciplina(active.disciplinaAtual);
      }
    }
  }, [turmaGroups, selectedTurmaId, activeAula, todayAulas, currentTime]);

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
        setJustificativas(new Map());
        setSelectedStudents(new Set());
        setOcorrencias("");
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
          const justificativaMap = new Map<string, string>();
          students.forEach((s) => presencaMap.set(s.id, "presente"));
          data.forEach((p) => {
            if (p.student_id) {
              presencaMap.set(p.student_id, p.status);
              if (p.justificativa) {
                justificativaMap.set(p.student_id, p.justificativa);
              }
            }
          });
          setPresencas(presencaMap);
          setJustificativas(justificativaMap);
        } else {
          const newMap = new Map<string, string>();
          students.forEach((s) => newMap.set(s.id, "presente"));
          setPresencas(newMap);
          setJustificativas(new Map());
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

  // Fetch all attendance records for chart
  useEffect(() => {
    const fetchAllRecords = async () => {
      if (!user || !selectedDisciplina) return;

      const { data } = await supabase
        .from("presencas")
        .select("data, status")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      if (data) {
        setAllAttendanceRecords(data);
      }
    };

    fetchAllRecords();
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
        const studentStats = new Map<string, { absences: number; lates: number; total: number }>();

        data.forEach((p) => {
          if (p.student_id) {
            const current = studentStats.get(p.student_id) || { absences: 0, lates: 0, total: 0 };
            current.total++;
            if (p.status === "ausente") current.absences++;
            if (p.status === "atrasado") current.lates++;
            studentStats.set(p.student_id, current);
          }
        });

        const riskMap = new Map<string, { absences: number; lates: number }>();
        const atRisk: StudentAtRisk[] = [];
        
        studentStats.forEach((stats, studentId) => {
          riskMap.set(studentId, { absences: stats.absences, lates: stats.lates });
          const student = students.find((s) => s.id === studentId);
          if (student && (stats.absences >= 2 || stats.lates >= 2)) {
            const percentage = Math.round(((stats.total - stats.absences) / stats.total) * 100);
            atRisk.push({ name: student.nome, percentage, absences: stats.absences });
          }
        });

        setStudentsRiskMap(riskMap);
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

  const setJustificativa = (studentId: string, justificativa: string) => {
    setJustificativas(new Map(justificativas.set(studentId, justificativa)));
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const toggleSelectAll = (visibleStudentIds?: string[]) => {
    const ids = visibleStudentIds ?? students.map((s) => s.id);
    const allVisible = ids.every((id) => selectedStudents.has(id));
    if (allVisible && ids.length > 0) {
      const next = new Set(selectedStudents);
      ids.forEach((id) => next.delete(id));
      setSelectedStudents(next);
    } else {
      const next = new Set(selectedStudents);
      ids.forEach((id) => next.add(id));
      setSelectedStudents(next);
    }
  };

  const applyBatchStatus = (status: string) => {
    if (selectedStudents.size === 0) {
      toast.warning("Selecione ao menos um aluno");
      return;
    }
    const newPresencas = new Map(presencas);
    selectedStudents.forEach((id) => {
      newPresencas.set(id, status);
    });
    setPresencas(newPresencas);
    toast.success(`${selectedStudents.size} aluno(s) marcados como ${status}`);
    setSelectedStudents(new Set());
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

      // Fetch previous day stats for comparison
      const { data: previousData } = await supabase
        .from("presencas")
        .select("status")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id)
        .lt("data", dateStr)
        .order("data", { ascending: false })
        .limit(students.length);

      if (previousData && previousData.length > 0) {
        setPreviousDayStats({
          present: previousData.filter((p) => p.status === "presente").length,
          absent: previousData.filter((p) => p.status === "ausente").length,
          late: previousData.filter((p) => p.status === "atrasado").length,
          total: previousData.length,
        });
      }

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
          justificativa: justificativas.get(studentId) || null,
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

      // Calculate stats for summary
      const stats = {
        present: Array.from(presencas.values()).filter((s) => s === "presente").length,
        absent: Array.from(presencas.values()).filter((s) => s === "ausente").length,
        late: Array.from(presencas.values()).filter((s) => s === "atrasado").length,
        total: students.length,
      };
      setLastSaveStats(stats);

      toast.success("Chamada salva com sucesso!");

      // Send notifications for students with issues
      const { data: allPresencas } = await supabase
        .from("presencas")
        .select("student_id, status")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      let issuesCount = 0;
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
            const st = studentStats.get(s.id);
            return st && st.absences + st.lates >= 2;
          })
          .map((s) => {
            const st = studentStats.get(s.id)!;
            const totalRecords = allPresencas.filter((p) => p.student_id === s.id).length;
            const frequenciaPercent = totalRecords > 0
              ? Math.round(((totalRecords - st.absences) / totalRecords) * 100)
              : 100;
            
            return {
              student_id: s.id,
              student_name: s.nome,
              student_email: s.email || null,
              total_absences: st.absences,
              total_lates: st.lates,
              status: presencas.get(s.id) || "pending",
              frequencia_percent: frequenciaPercent,
            };
          });

        issuesCount = studentsWithIssues.length;
        setStudentsWithIssuesCount(issuesCount);

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
                ocorrencias: ocorrencias || null,
              },
            });
            setNotificationsSent(true);
          } catch {
            console.log("Notificações não configuradas");
            setNotificationsSent(false);
          }
        }
      }

      classStartTimeRef.current = new Date();
      setShowSummaryDialog(true);
    } catch (error: any) {
      toast.error("Erro ao salvar chamada: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHistory = (student: Student) => {
    setSelectedStudentForHistory(student);
    setShowHistoryDialog(true);
  };

  const handleExportPDF = () => {
    if (!selectedDisciplina || !selectedDate) return;
    
    const dateStr = format(selectedDate, "dd-MM-yyyy");
    const content = `
RELATÓRIO DE FREQUÊNCIA
=======================

Disciplina: ${selectedDisciplina.nome}
Turma: ${selectedDisciplina.turmas?.nome || "N/A"}
Data: ${format(selectedDate, "dd/MM/yyyy")}
Professor: ${selectedDisciplina.nome_professor || "N/A"}

RESUMO
------
Presentes: ${lastSaveStats?.present || 0}
Ausentes: ${lastSaveStats?.absent || 0}
Atrasados: ${lastSaveStats?.late || 0}
Total: ${lastSaveStats?.total || 0}
Frequência: ${lastSaveStats ? Math.round((lastSaveStats.present / lastSaveStats.total) * 100) : 0}%

LISTA DE ALUNOS
---------------
${students.map((s) => {
  const status = presencas.get(s.id) || "presente";
  const just = justificativas.get(s.id);
  return `${s.nome} (${s.matricula}): ${status.toUpperCase()}${just ? ` - ${just}` : ""}`;
}).join("\n")}

${ocorrencias ? `\nOCORRÊNCIAS\n-----------\n${ocorrencias}` : ""}
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `frequencia_${selectedDisciplina.nome.replace(/\s+/g, "_")}_${dateStr}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  const todayStats = {
    present: Array.from(presencas.values()).filter((s) => s === "presente").length,
    absent: Array.from(presencas.values()).filter((s) => s === "ausente").length,
    late: Array.from(presencas.values()).filter((s) => s === "atrasado").length,
    total: students.length || 1,
  };

  const pontualidadePercent = todayStats.present + todayStats.late > 0
    ? Math.round((todayStats.present / (todayStats.present + todayStats.late)) * 100)
    : 100;

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

  // Determine which turma IDs are active right now (in current time slot)
  const nowTimeStr = format(currentTime, "HH:mm:ss");
  const activeTurmaIds = new Set(
    todayAulas
      .filter((a) => a.hora_inicio <= nowTimeStr && a.hora_fim >= nowTimeStr)
      .map((a) => a.turma_id)
      .filter(Boolean)
  );

  // All turma IDs scheduled today
  const todayTurmaIds = new Set(
    todayAulas.map((a) => a.turma_id).filter(Boolean)
  );

  // Greeting helpers
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const professorName = professorMatch?.nome || activeAula?.professor?.nome || user?.email?.split("@")[0] || "Professor(a)";
  const firstName = professorName.split(" ")[0];

  const motivationalPhrases = [
    "Cada aula é uma semente de transformação. Vamos fazer a diferença hoje! 🌱",
    "Ensinar é acender uma luz que nunca se apaga. Brilhe hoje! ✨",
    "Sua dedicação constrói futuros. A turma de hoje tem sorte de ter você! 🎯",
    "O conhecimento que você compartilha hoje será o alicerce de amanhã. 📚",
    "Grandes professores inspiram grandes conquistas. Vamos lá! 🚀",
  ];
  const dailyPhrase = motivationalPhrases[currentTime.getDate() % motivationalPhrases.length];

  return (
    <div className="space-y-6">
      {/* Greeting & Header */}
      <div className="space-y-3">
        <Card className="p-4 border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {getGreeting()}, {firstName}! 👋
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">{dailyPhrase}</p>
              {activeAula?.turma && (
                <p className="text-xs text-primary mt-1 font-medium">
                  Turma do momento: {activeAula.turma.nome} • {activeAula.hora_inicio.slice(0, 5)} - {activeAula.hora_fim.slice(0, 5)}
                </p>
              )}
            </div>
          </div>
        </Card>

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
          <h2 className="font-semibold text-foreground">
            {todayAulas.length > 0 ? "Turmas Agendadas Hoje" : "Suas Turmas"}
          </h2>
          {todayAulas.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {activeTurmaIds.size > 0
                ? `${activeTurmaIds.size} no horário atual`
                : `${todayTurmaIds.size} agendadas`}
            </Badge>
          )}
        </div>

        {(() => {
          // When cronograma has entries for today, show ONLY those turmas
          const turmasToShow = todayAulas.length > 0
            ? turmaGroups.filter((t) => todayTurmaIds.has(t.turmaId))
            : turmaGroups;

          if (turmasToShow.length === 0) {
            return (
              <Card className="p-8 text-center">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {todayAulas.length > 0
                    ? "Nenhuma turma do cronograma de hoje possui disciplinas vinculadas."
                    : "Nenhuma turma com disciplinas cadastradas."}
                </p>
                <Button variant="outline" className="mt-3" onClick={() => setShowAddDisciplina(true)}>
                  Adicionar Disciplina
                </Button>
              </Card>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {turmasToShow.map((turma) => {
                // Lock turmas that are scheduled today but NOT in the current time slot
                const hasActiveSlots = activeTurmaIds.size > 0;
                const isTurmaActive = activeTurmaIds.has(turma.turmaId);
                const isLocked = hasActiveSlots && !isTurmaActive;

                return (
                  <TurmaAttendanceCard
                    key={turma.turmaId}
                    turma={turma}
                    isSelected={selectedTurmaId === turma.turmaId}
                    onSelect={handleSelectTurma}
                    isLocked={isLocked}
                  />
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Stats Cards with Punctuality KPI */}
      {selectedDisciplina && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3 gradient-card shadow-card border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
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
              <div className="w-9 h-9 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
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
              <div className="w-9 h-9 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
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
          <Card className="p-3 gradient-card shadow-card border-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{pontualidadePercent}%</p>
                <p className="text-xs text-muted-foreground">Pontualidade</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {selectedDisciplina && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student List */}
          <div className="lg:col-span-2 space-y-4">
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
                    {/* View mode toggle */}
                    <div className="flex items-center border rounded-lg p-0.5">
                      <Button
                        variant={viewMode === "cards" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setViewMode("cards")}
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "table" ? "default" : "ghost"}
                        size="sm"
                        className="h-7 px-2"
                        onClick={() => setViewMode("table")}
                      >
                        <TableIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-[110px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name-asc">Nome A-Z</SelectItem>
                        <SelectItem value="name-desc">Nome Z-A</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" className="h-8" onClick={markAllPresent}>
                      <CheckCircle className="w-4 h-4 mr-1.5" />
                      Todos Presentes
                    </Button>
                  </div>
                </div>

                {/* Search and batch actions */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno..."
                      className="pl-9 h-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Batch actions */}
                  {selectedStudents.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedStudents.size} selecionados
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => applyBatchStatus("presente")}
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-600" />
                        Presentes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => applyBatchStatus("ausente")}
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1 text-red-600" />
                        Ausentes
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => applyBatchStatus("atrasado")}
                      >
                        <Clock className="w-3.5 h-3.5 mr-1 text-yellow-600" />
                        Atrasados
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Progress value={progressPercent} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground">{progressPercent}%</span>
                </div>
              </div>

              {/* Table View */}
              {viewMode === "table" ? (
                <div className="p-4">
                  <AttendanceTableView
                    students={sortedStudents}
                    presencas={presencas}
                    justificativas={justificativas}
                    setStatus={setStatus}
                    setJustificativa={setJustificativa}
                    selectedStudents={selectedStudents}
                    toggleStudentSelection={toggleStudentSelection}
                    toggleSelectAll={toggleSelectAll}
                    studentsAtRisk={studentsRiskMap}
                    onViewHistory={handleViewHistory}
                    searchQuery={searchQuery}
                  />
                </div>
              ) : (
                /* Card View */
                <div className="p-4 space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum aluno encontrado
                    </p>
                  ) : (
                    filteredStudents.map((student) => {
                      const currentStatus = presencas.get(student.id) || "presente";
                      const riskData = studentsRiskMap.get(student.id);
                      const isAtRisk = riskData && (riskData.absences >= 2 || riskData.lates >= 3);

                      return (
                        <div
                          key={student.id}
                          className={`p-3 rounded-lg border transition-all ${
                            currentStatus === "presente"
                              ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                              : currentStatus === "ausente"
                              ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                              : "bg-yellow-50/50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedStudents.has(student.id)}
                                onChange={() => toggleStudentSelection(student.id)}
                                className="w-4 h-4 rounded border-input"
                              />
                              <div
                                className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center cursor-pointer"
                                onClick={() => handleViewHistory(student)}
                              >
                                <span className="text-sm font-semibold text-primary">
                                  {getInitials(student.nome)}
                                </span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-foreground">{student.nome}</p>
                                  {isAtRisk && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                      <AlertTriangle className="w-3 h-3 mr-0.5" />
                                      Risco
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">{student.matricula}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant={currentStatus === "presente" ? "default" : "outline"}
                                size="sm"
                                className={`h-8 ${currentStatus === "presente" ? "bg-green-500 hover:bg-green-600" : ""}`}
                                onClick={() => setStatus(student.id, "presente")}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={currentStatus === "ausente" ? "default" : "outline"}
                                size="sm"
                                className={`h-8 ${currentStatus === "ausente" ? "bg-red-500 hover:bg-red-600" : ""}`}
                                onClick={() => setStatus(student.id, "ausente")}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant={currentStatus === "atrasado" ? "default" : "outline"}
                                size="sm"
                                className={`h-8 ${currentStatus === "atrasado" ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                                onClick={() => setStatus(student.id, "atrasado")}
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                onClick={() => handleViewHistory(student)}
                              >
                                <History className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Ocorrências section */}
              <div className="p-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Ocorrências e Observações do Dia</span>
                </div>
                <Textarea
                  placeholder="Registre aqui observações gerais, conteúdo ministrado, incidentes..."
                  value={ocorrencias}
                  onChange={(e) => setOcorrencias(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <div className="p-4 border-t flex gap-3">
                <Button
                  className="flex-1"
                  disabled={isLoading || students.length === 0}
                  onClick={handleSaveClick}
                >
                  {isLoading ? "Salvando..." : "Salvar Chamada"}
                </Button>
                <Button variant="outline" onClick={handleExportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </Card>

            {/* Frequency Chart */}
            {allAttendanceRecords.length > 0 && (
              <AttendanceFrequencyChart records={allAttendanceRecords} />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="gradient-card shadow-card border-0 p-4">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                Calendário
              </h3>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                modifiers={calendarModifiers}
                modifiersStyles={calendarModifiersStyles}
                className="rounded-md border pointer-events-auto"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Dias com chamada marcados em destaque
              </p>
            </Card>

            {studentsAtRisk.length > 0 && (
              <Card className="gradient-card shadow-card border-0 p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Alunos em Risco
                </h3>
                <div className="space-y-2">
                  {studentsAtRisk.map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                      <span className="text-sm font-medium truncate">{s.name}</span>
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">
                        {s.absences} faltas • {s.percentage}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AddDisciplinaDialog
        open={showAddDisciplina}
        onOpenChange={setShowAddDisciplina}
        onSuccess={refreshDisciplinas}
      />

      <DisciplinaDetailsDialog
        open={showDisciplinaDetails}
        onOpenChange={setShowDisciplinaDetails}
        disciplina={selectedDisciplina}
      />

      <EditDisciplinaDialog
        open={showEditDisciplina}
        onOpenChange={setShowEditDisciplina}
        disciplina={selectedDisciplina}
        onSuccess={refreshDisciplinas}
      />

      <StudentFrequencyHistory
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
        student={selectedStudentForHistory}
        disciplinaId={selectedDisciplina?.id || null}
        disciplinaNome={selectedDisciplina?.nome}
      />

      <AttendanceSaveSummary
        open={showSummaryDialog}
        onOpenChange={setShowSummaryDialog}
        stats={lastSaveStats || { present: 0, absent: 0, late: 0, total: 0 }}
        previousStats={previousDayStats}
        date={selectedDate || new Date()}
        disciplinaNome={selectedDisciplina?.nome || ""}
        turmaNome={selectedTurmaGroup?.turmaNome || ""}
        studentsWithIssues={studentsWithIssuesCount}
        notificationsSent={notificationsSent}
        onExportPDF={handleExportPDF}
      />

      {/* Confirm Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Chamada</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Confirma o registro de presença para {selectedDate && format(selectedDate, "dd/MM/yyyy")}?</p>
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <p className="text-lg font-bold text-green-600">{todayStats.present}</p>
                  <p className="text-xs text-muted-foreground">Presentes</p>
                </div>
                <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                  <p className="text-lg font-bold text-red-600">{todayStats.absent}</p>
                  <p className="text-xs text-muted-foreground">Ausentes</p>
                </div>
                <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <p className="text-lg font-bold text-yellow-600">{todayStats.late}</p>
                  <p className="text-xs text-muted-foreground">Atrasados</p>
                </div>
              </div>
              <p className="text-center pt-2">
                <span className="font-semibold">{Math.round((todayStats.present / todayStats.total) * 100)}%</span> de frequência
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={saveAttendance}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
