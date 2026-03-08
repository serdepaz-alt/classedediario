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
import { format, isBefore, isAfter, isToday, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  Calendar as CalendarIcon, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Plus,
  AlertTriangle,
  BarChart3,
  Search,
} from "lucide-react";
import { AddDisciplinaDialog } from "./attendance/AddDisciplinaDialog";
import { DisciplinaDetailsDialog } from "./attendance/DisciplinaDetailsDialog";
import { EditDisciplinaDialog } from "./attendance/EditDisciplinaDialog";
import { DisciplinaCard } from "./attendance/DisciplinaCard";

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
  turmas?: {
    nome: string;
  } | null;
}

interface Student {
  id: string;
  nome: string;
  matricula: string;
  email?: string | null;
}

interface Presenca {
  id: string;
  student_id: string;
  status: string;
  justificativa?: string;
}

interface StudentAtRisk {
  name: string;
  percentage: number;
  absences: number;
}

export const Attendance = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [selectedDisciplina, setSelectedDisciplina] = useState<Disciplina | null>(null);
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

  // Collapsible states
  const [pastExpanded, setPastExpanded] = useState(false);
  const [currentExpanded, setCurrentExpanded] = useState(true);
  const [futureExpanded, setFutureExpanded] = useState(false);

  // Track class start time (when teacher opens the page)
  const classStartTimeRef = useRef<Date | null>(null);

  // Set class start time on initial load
  useEffect(() => {
    if (!classStartTimeRef.current) {
      classStartTimeRef.current = new Date();
    }
  }, []);

  // Classify disciplines
  const { pastDisciplinas, currentDisciplinas, futureDisciplinas } = useMemo(() => {
    const today = startOfDay(new Date());
    
    const past: Disciplina[] = [];
    const current: Disciplina[] = [];
    const future: Disciplina[] = [];

    disciplinas.forEach((d) => {
      const startDate = startOfDay(new Date(d.data_inicio));
      const endDate = startOfDay(new Date(d.data_termino));

      if (isAfter(startDate, today)) {
        future.push(d);
      } else if (isBefore(endDate, today)) {
        past.push(d);
      } else {
        current.push(d);
      }
    });

    return { pastDisciplinas: past, currentDisciplinas: current, futureDisciplinas: future };
  }, [disciplinas]);

  // Fetch disciplinas
  useEffect(() => {
    const fetchDisciplinas = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from("disciplinas")
        .select(`
          *,
          turmas (nome)
        `)
        .eq("user_id", user.id);

      if (!error && data) {
        setDisciplinas(data);
        // Auto-select first current discipline
        const today = startOfDay(new Date());
        const currentDisc = data.find((d) => {
          const startDate = startOfDay(new Date(d.data_inicio));
          const endDate = startOfDay(new Date(d.data_termino));
          return !isAfter(startDate, today) && !isBefore(endDate, today);
        });
        if (currentDisc && !selectedDisciplina) {
          setSelectedDisciplina(currentDisc);
        }
      }
    };

    fetchDisciplinas();
  }, [user]);

  // Fetch students when disciplina changes — mark all as "presente" by default
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
        .order("nome", { ascending: true });

      if (!error && data) {
        setStudents(data);
        // ✅ Initialize all as PRESENT by default (chamada rápida)
        const initialPresencas = new Map<string, string>();
        data.forEach(s => initialPresencas.set(s.id, "presente"));
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
          // If there's existing data, use it
          const presencaMap = new Map<string, string>();
          // Start with all present
          students.forEach(s => presencaMap.set(s.id, "presente"));
          // Override with saved data
          data.forEach(p => {
            if (p.student_id) {
              presencaMap.set(p.student_id, p.status);
            }
          });
          setPresencas(presencaMap);
        } else {
          // No saved data — all present by default
          const newMap = new Map<string, string>();
          students.forEach(s => newMap.set(s.id, "presente"));
          setPresencas(newMap);
        }
      }
    };

    fetchPresencas();
  }, [user, selectedDisciplina, selectedDate, students]);

  // Fetch dates with attendance for calendar indicator
  useEffect(() => {
    const fetchAttendanceDates = async () => {
      if (!user || !selectedDisciplina) return;

      const { data, error } = await supabase
        .from("presencas")
        .select("data")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      if (!error && data) {
        const dates = new Set(data.map(p => p.data));
        setDatesWithAttendance(dates);
      }
    };

    fetchAttendanceDates();
  }, [user, selectedDisciplina]);

  // Fetch students at risk
  useEffect(() => {
    const fetchStudentsAtRisk = async () => {
      if (!user || !selectedDisciplina) return;

      const { data, error } = await supabase
        .from("presencas")
        .select("student_id, status")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      if (!error && data && students.length > 0) {
        const studentStats = new Map<string, { absences: number; total: number }>();
        
        data.forEach(p => {
          if (p.student_id) {
            const current = studentStats.get(p.student_id) || { absences: 0, total: 0 };
            current.total++;
            if (p.status === "ausente" || p.status === "atrasado") {
              current.absences++;
            }
            studentStats.set(p.student_id, current);
          }
        });

        const atRisk: StudentAtRisk[] = [];
        studentStats.forEach((stats, studentId) => {
          const student = students.find(s => s.id === studentId);
          if (student && stats.absences >= 2) {
            const percentage = Math.round(((stats.total - stats.absences) / stats.total) * 100);
            atRisk.push({
              name: student.nome,
              percentage,
              absences: stats.absences,
            });
          }
        });

        setStudentsAtRisk(atRisk.sort((a, b) => a.percentage - b.percentage).slice(0, 5));
      }
    };

    fetchStudentsAtRisk();
  }, [user, selectedDisciplina, students]);

  const refreshDisciplinas = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("disciplinas")
      .select("*, turmas (nome)")
      .eq("user_id", user.id);

    if (data) {
      setDisciplinas(data);
      if (selectedDisciplina) {
        const updated = data.find(d => d.id === selectedDisciplina.id);
        if (updated) {
          setSelectedDisciplina(updated);
        }
      }
    }
  };

  const setStatus = (studentId: string, status: string) => {
    setPresencas(new Map(presencas.set(studentId, status)));
  };

  const markAllPresent = () => {
    const newPresencas = new Map<string, string>();
    students.forEach(s => newPresencas.set(s.id, "presente"));
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
      
      // Delete existing records for this date/disciplina
      await supabase
        .from("presencas")
        .delete()
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id)
        .eq("data", dateStr);

      // Insert new records with timestamps
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

      // Update calendar indicator
      setDatesWithAttendance(prev => new Set([...prev, dateStr]));

      toast.success("Chamada salva com sucesso!");

      // Get accumulated absences/lates for each student
      const { data: allPresencas } = await supabase
        .from("presencas")
        .select("student_id, status")
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id);

      if (allPresencas) {
        const studentStats = new Map<string, { absences: number; lates: number }>();
        
        allPresencas.forEach(p => {
          if (p.student_id) {
            const current = studentStats.get(p.student_id) || { absences: 0, lates: 0 };
            if (p.status === "ausente") current.absences++;
            if (p.status === "atrasado") current.lates++;
            studentStats.set(p.student_id, current);
          }
        });

        const studentsWithIssues = students
          .filter(s => {
            const stats = studentStats.get(s.id);
            return stats && (stats.absences + stats.lates >= 2);
          })
          .map(s => {
            const stats = studentStats.get(s.id)!;
            const currentStatus = presencas.get(s.id) || "pending";
            return {
              student_id: s.id,
              student_name: s.nome,
              student_email: s.email || null,
              total_absences: stats.absences,
              total_lates: stats.lates,
              status: currentStatus,
            };
          });

        const studentsPresent = students
          .filter(s => presencas.get(s.id) === "presente")
          .map(s => ({
            student_id: s.id,
            student_name: s.nome,
            student_email: s.email || null,
          }));

        if (studentsWithIssues.length > 0 || studentsPresent.length > 0) {
          try {
            const response = await supabase.functions.invoke("send-attendance-notifications", {
              body: {
                disciplina_id: selectedDisciplina.id,
                disciplina_nome: selectedDisciplina.nome,
                data: dateStr,
                admin_email: user.email || "",
                students_with_issues: studentsWithIssues,
                students_present: studentsPresent,
              },
            });
            
            if (response.error) {
              console.log("Notificações não enviadas:", response.error.message);
            } else {
              console.log("Notificações enviadas com sucesso");
            }
          } catch (error) {
            console.log("Edge function não configurada ou erro ao enviar notificações");
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
    present: Array.from(presencas.values()).filter(s => s === "presente").length,
    absent: Array.from(presencas.values()).filter(s => s === "ausente").length,
    late: Array.from(presencas.values()).filter(s => s === "atrasado").length,
    total: students.length || 1,
  };

  const markedCount = Array.from(presencas.values()).filter(s => s !== "pending").length;
  const progressPercent = students.length > 0 ? Math.round((markedCount / students.length) * 100) : 0;

  const sortedStudents = [...students].sort((a, b) => {
    if (sortOrder === "name-asc") return a.nome.localeCompare(b.nome);
    if (sortOrder === "name-desc") return b.nome.localeCompare(a.nome);
    return 0;
  });

  const filteredStudents = sortedStudents.filter(s =>
    s.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  };

  // Calendar day modifiers for attendance indicator
  const calendarModifiers = {
    hasAttendance: (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return datesWithAttendance.has(dateStr);
    },
  };

  const calendarModifiersStyles = {
    hasAttendance: {
      backgroundColor: "hsl(var(--primary) / 0.15)",
      borderRadius: "50%",
      fontWeight: "bold" as const,
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Presença</h1>
          <p className="text-muted-foreground">Gerencie a frequência dos estudantes</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowAddDisciplina(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Disciplina
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-1" />
            Análise de Presença
          </Button>
          <Button onClick={markAllPresent}>
            Marcar Todos
          </Button>
        </div>
      </div>

      {/* Discipline Cards - 3 Collapsible Sections */}
      <div className="space-y-4">
        <DisciplinaCard
          title="Disciplinas Anteriores"
          disciplinas={pastDisciplinas}
          isExpanded={pastExpanded}
          onToggle={() => setPastExpanded(!pastExpanded)}
          onSelectDisciplina={(d) => {
            setSelectedDisciplina(d);
            setPastExpanded(false);
            setCurrentExpanded(true);
          }}
          variant="past"
        />

        <DisciplinaCard
          title="Disciplina Atual"
          disciplinas={currentDisciplinas}
          isExpanded={currentExpanded}
          onToggle={() => setCurrentExpanded(!currentExpanded)}
          currentDisciplina={selectedDisciplina}
          onSelectDisciplina={setSelectedDisciplina}
          onDetailsClick={(d) => {
            setSelectedDisciplina(d);
            setShowDisciplinaDetails(true);
          }}
          onEditClick={(d) => {
            setSelectedDisciplina(d);
            setShowEditDisciplina(true);
          }}
          variant="current"
        />

        <DisciplinaCard
          title="Disciplinas Futuras"
          disciplinas={futureDisciplinas}
          isExpanded={futureExpanded}
          onToggle={() => setFutureExpanded(!futureExpanded)}
          onSelectDisciplina={(d) => {
            setSelectedDisciplina(d);
            setFutureExpanded(false);
            setCurrentExpanded(true);
          }}
          variant="future"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayStats.present}</p>
              <p className="text-sm text-muted-foreground">Presentes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayStats.absent}</p>
              <p className="text-sm text-muted-foreground">Ausente</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{todayStats.late}</p>
              <p className="text-sm text-muted-foreground">Atrasados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Math.round((todayStats.present / todayStats.total) * 100)}%
              </p>
              <p className="text-sm text-muted-foreground">Taxa de Presença</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student List */}
          <Card className="gradient-card shadow-card border-0">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-semibold text-foreground">Lista de Chamada</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="w-4 h-4" />
                    {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR })}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ordenar:</span>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
                        <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Search + Progress Bar */}
              <div className="mt-4 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aluno por nome..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progressPercent} className="h-2 flex-1" />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {markedCount}/{students.length} marcados
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    {searchQuery ? (
                      <p>Nenhum aluno encontrado para "{searchQuery}".</p>
                    ) : (
                      <>
                        <p>Nenhum estudante encontrado.</p>
                        <p className="text-sm">
                          {selectedDisciplina?.turma_id 
                            ? "Adicione estudantes à turma na aba Estudantes."
                            : "Edite a disciplina para vincular uma turma."}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const status = presencas.get(student.id) || "presente";
                    
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-background/50 hover:bg-background/80 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-muted-foreground">
                              {getInitials(student.nome)}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{student.nome}</span>
                        </div>
                        
                        {/* 3 Status Icons Side by Side */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setStatus(student.id, "presente")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                              status === "presente"
                                ? "bg-green-500 text-white shadow-md"
                                : "bg-green-100 text-green-700 hover:bg-green-200"
                            }`}
                            title="Presente"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">P</span>
                          </button>

                          <button
                            onClick={() => setStatus(student.id, "ausente")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                              status === "ausente"
                                ? "bg-red-500 text-white shadow-md"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                            title="Ausente"
                          >
                            <XCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">F</span>
                          </button>

                          <button
                            onClick={() => setStatus(student.id, "atrasado")}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                              status === "atrasado"
                                ? "bg-yellow-500 text-white shadow-md"
                                : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                            }`}
                            title="Atrasado"
                          >
                            <Clock className="w-4 h-4" />
                            <span className="hidden sm:inline">A</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <Button variant="outline" className="flex-1" onClick={markAllPresent}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Marcar Todos Presentes
                </Button>
                <Button className="flex-1" onClick={handleSaveClick} disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Salvar Chamada"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Date Display */}
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-lg font-semibold">
              {selectedDate && format(selectedDate, "MMM yyyy", { locale: ptBR })}
            </p>
          </div>

          {/* Calendar with attendance indicators */}
          <Card className="p-4 gradient-card shadow-card border-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Calendário</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-full bg-primary/20" />
                <span>Chamada feita</span>
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

          {/* Students at Risk */}
          <Card className="p-4 gradient-card shadow-card border-0">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-foreground">Alunos de Risco</h3>
            </div>
            {studentsAtRisk.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum aluno em situação de risco.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {studentsAtRisk.map((student, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-yellow-500">•</span>
                    <span>{student.name} ({student.percentage}% - {student.absences} Faltas/Atrasos)</span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="link" className="p-0 h-auto mt-3 text-primary">
              [Ver Relatório Completo]
            </Button>
          </Card>
        </div>
      </div>

      {/* Confirm Save Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Chamada</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Confirma o registro de chamada para{" "}
                  <strong>
                    {selectedDate && format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </strong>
                  ?
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
                  Taxa de presença: <strong>{Math.round((todayStats.present / todayStats.total) * 100)}%</strong> ({todayStats.present}/{students.length} alunos)
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Revisar</AlertDialogCancel>
            <AlertDialogAction onClick={saveAttendance}>
              Confirmar e Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </div>
  );
};
