import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
}

interface Presenca {
  id: string;
  student_id: string;
  status: string;
  justificativa?: string;
}

const studentsAtRisk = [
  { name: "João Santos", percentage: 65, absences: 14 },
  { name: "Pedro", percentage: 55, absences: 21 },
];

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

  // Collapsible states
  const [pastExpanded, setPastExpanded] = useState(false);
  const [currentExpanded, setCurrentExpanded] = useState(true);
  const [futureExpanded, setFutureExpanded] = useState(false);

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

  // Fetch students when disciplina changes
  useEffect(() => {
    const fetchStudents = async () => {
      if (!user || !selectedDisciplina || !selectedDisciplina.turma_id) {
        setStudents([]);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select("id, nome, matricula")
        .eq("user_id", user.id)
        .eq("turma_id", selectedDisciplina.turma_id)
        .order("nome", { ascending: true });

      if (!error && data) {
        setStudents(data);
        // Initialize all as pending
        const initialPresencas = new Map<string, string>();
        data.forEach(s => initialPresencas.set(s.id, "pending"));
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
        const presencaMap = new Map<string, string>();
        data.forEach(p => {
          if (p.student_id) {
            presencaMap.set(p.student_id, p.status);
          }
        });
        setPresencas(prev => {
          const newMap = new Map(prev);
          presencaMap.forEach((status, studentId) => {
            newMap.set(studentId, status);
          });
          return newMap;
        });
      }
    };

    fetchPresencas();
  }, [user, selectedDisciplina, selectedDate]);

  const refreshDisciplinas = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("disciplinas")
      .select("*, turmas (nome)")
      .eq("user_id", user.id);

    if (data) {
      setDisciplinas(data);
      // Re-select the edited disciplina
      if (selectedDisciplina) {
        const updated = data.find(d => d.id === selectedDisciplina.id);
        if (updated) {
          setSelectedDisciplina(updated);
        }
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "presente":
        return { label: "Presente", variant: "default" as const, icon: CheckCircle, color: "bg-green-500" };
      case "ausente":
        return { label: "Ausente", variant: "destructive" as const, icon: XCircle, color: "bg-red-500" };
      case "atrasado":
        return { label: "Atrasado", variant: "secondary" as const, icon: Clock, color: "bg-yellow-500" };
      default:
        return { label: "Ausente", variant: "outline" as const, icon: Clock, color: "bg-gray-300" };
    }
  };

  const cycleStatus = (studentId: string) => {
    const currentStatus = presencas.get(studentId) || "pending";
    let newStatus: string;
    
    switch (currentStatus) {
      case "pending":
      case "ausente":
        newStatus = "presente";
        break;
      case "presente":
        newStatus = "atrasado";
        break;
      case "atrasado":
        newStatus = "ausente";
        break;
      default:
        newStatus = "presente";
    }

    setPresencas(new Map(presencas.set(studentId, newStatus)));
  };

  const markAllPresent = () => {
    const newPresencas = new Map<string, string>();
    students.forEach(s => newPresencas.set(s.id, "presente"));
    setPresencas(newPresencas);
    toast.success("Todos marcados como presentes");
  };

  const saveAttendance = async () => {
    if (!user || !selectedDisciplina || !selectedDate) return;

    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      // Delete existing records for this date/disciplina
      await supabase
        .from("presencas")
        .delete()
        .eq("user_id", user.id)
        .eq("disciplina_id", selectedDisciplina.id)
        .eq("data", dateStr);

      // Insert new records
      const records = Array.from(presencas.entries())
        .filter(([_, status]) => status !== "pending")
        .map(([studentId, status]) => ({
          user_id: user.id,
          disciplina_id: selectedDisciplina.id,
          student_id: studentId,
          data: dateStr,
          status,
        }));

      if (records.length > 0) {
        const { error } = await supabase.from("presencas").insert(records);
        if (error) throw error;
      }

      toast.success("Chamada salva com sucesso!");
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

  const sortedStudents = [...students].sort((a, b) => {
    if (sortOrder === "name-asc") return a.nome.localeCompare(b.nome);
    if (sortOrder === "name-desc") return b.nome.localeCompare(a.nome);
    return 0;
  });

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
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
        {/* Past Disciplines */}
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

        {/* Current Discipline */}
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

        {/* Future Disciplines */}
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
                    <Button variant="ghost" size="icon">
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                {sortedStudents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum estudante encontrado.</p>
                    <p className="text-sm">
                      {selectedDisciplina?.turma_id 
                        ? "Adicione estudantes à turma na aba Estudantes."
                        : "Edite a disciplina para vincular uma turma."}
                    </p>
                  </div>
                ) : (
                  sortedStudents.map((student) => {
                    const status = presencas.get(student.id) || "pending";
                    const statusInfo = getStatusBadge(status);
                    
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
                        
                        <div className="flex items-center gap-3">
                          <Button
                            variant={status === "presente" ? "default" : "outline"}
                            size="sm"
                            className={status === "presente" ? "bg-green-500 hover:bg-green-600" : ""}
                            onClick={() => cycleStatus(student.id)}
                          >
                            {statusInfo.label}
                          </Button>
                          <button
                            onClick={() => cycleStatus(student.id)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                              status === "presente" ? "bg-green-500 text-white" :
                              status === "ausente" ? "bg-red-500 text-white" :
                              status === "atrasado" ? "bg-yellow-500 text-white" :
                              "bg-gray-200"
                            }`}
                          >
                            {status === "presente" && <CheckCircle className="w-4 h-4" />}
                            {status === "ausente" && <XCircle className="w-4 h-4" />}
                            {status === "atrasado" && <Clock className="w-4 h-4" />}
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
                <Button className="flex-1" onClick={saveAttendance} disabled={isLoading}>
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

          {/* Calendar */}
          <Card className="p-4 gradient-card shadow-card border-0">
            <h3 className="text-lg font-semibold text-foreground mb-4">Calendário</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="rounded-md border-0 pointer-events-auto"
            />
          </Card>

          {/* Students at Risk */}
          <Card className="p-4 gradient-card shadow-card border-0">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-foreground">Alunos de Risco</h3>
            </div>
            <ul className="space-y-2 text-sm">
              {studentsAtRisk.map((student, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-yellow-500">•</span>
                  <span>{student.name} ({student.percentage}% - {student.absences} Faltas)</span>
                </li>
              ))}
            </ul>
            <Button variant="link" className="p-0 h-auto mt-3 text-primary">
              [Ver Relatório Completo]
            </Button>
          </Card>
        </div>
      </div>

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
