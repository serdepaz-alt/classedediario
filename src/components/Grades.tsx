import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Award, 
  Download,
  Trophy,
  Lock,
  AlertTriangle,
  Loader2,
  ChevronDown,
  GraduationCap
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { StudentGradesFlyout } from "@/components/grades/StudentGradesFlyout";
import { GradeBarChart } from "@/components/grades/GradeBarChart";
import { GradeEntry } from "@/components/grades/GradeEntry";
import { TurmaDisciplinaSelector } from "@/components/grades/TurmaDisciplinaSelector";
import { useAceiteCronograma } from "@/hooks/useAceiteCronograma";
import { useGrades } from "@/hooks/useGrades";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface DashboardStudent {
  id: string;
  student: string;
  matricula: string;
  grades: Record<string, number[]>;
}

type ViewMode = "dashboard" | "selector" | "entry";

export const Grades = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<DashboardStudent | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [entryParams, setEntryParams] = useState<{ turmaId: string; disciplinaId: string; turmaNome: string; disciplinaNome: string } | null>(null);
  const [selectedTurmaForSelector, setSelectedTurmaForSelector] = useState<{ id: string; nome: string } | null>(null);
  const [turmaDisciplinas, setTurmaDisciplinas] = useState<{ turma_id: string; turma_nome: string; disciplina_id: string; disciplina_nome: string }[]>([]);
  const { hasPending, pendingCount } = useAceiteCronograma();
  const { user } = useAuth();
  const { professorNome, turmasDisponiveis, loading: loadingProfessor, fetchAllGradesForDisciplina } = useGrades();

  // Active turmas for dropdown
  const [activeTurmas, setActiveTurmas] = useState<{ id: string; nome: string; curso: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchActiveTurmas = async () => {
      const { data } = await supabase
        .from("turmas")
        .select("id, nome, curso")
        .eq("user_id", user.id)
        .eq("status", "Ativa")
        .order("nome");
      setActiveTurmas(data || []);
    };
    fetchActiveTurmas();
  }, [user]);

  // Real dashboard data
  const [dashboardStudents, setDashboardStudents] = useState<DashboardStudent[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Build dashboard from all professor's disciplinas
  useEffect(() => {
    if (loadingProfessor || turmasDisponiveis.length === 0) {
      setLoadingDashboard(false);
      return;
    }

    const buildDashboard = async () => {
      setLoadingDashboard(true);
      const studentMap = new Map<string, DashboardStudent>();
      const subjectSet = new Set<string>();

      for (const turma of turmasDisponiveis) {
        const allGrades = await fetchAllGradesForDisciplina(turma.disciplina_id);
        const discName = turma.disciplina_nome;
        subjectSet.add(discName);

        for (const nota of allGrades) {
          const studentData = (nota as any).students;
          if (!studentData) continue;

          const key = nota.student_id;
          if (!studentMap.has(key)) {
            studentMap.set(key, {
              id: key,
              student: studentData.nome,
              matricula: studentData.matricula,
              grades: {},
            });
          }

          const s = studentMap.get(key)!;
          if (!s.grades[discName]) s.grades[discName] = [];
          if (nota.valor !== null) {
            s.grades[discName].push(nota.valor);
          }
        }
      }

      setSubjects(Array.from(subjectSet));
      setDashboardStudents(Array.from(studentMap.values()));
      setLoadingDashboard(false);
    };

    buildDashboard();
  }, [loadingProfessor, turmasDisponiveis]);

  const calculateAverage = (grades: number[]) => {
    if (grades.length === 0) return 0;
    return grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
  };

  const calculateStudentOverallAverage = (studentGrades: Record<string, number[]>) => {
    const allGrades = Object.values(studentGrades).flat();
    return calculateAverage(allGrades);
  };

  const getGradeColor = (average: number): "success" | "warning" | "destructive" => {
    if (average >= 7.5) return "success";
    if (average >= 6.0) return "warning";
    return "destructive";
  };

  // Handle turma selection from dropdown - fetch disciplinas for that turma
  const handleTurmaSelect = async (turma: { id: string; nome: string }) => {
    const { data } = await supabase
      .from("disciplinas")
      .select("id, nome")
      .eq("turma_id", turma.id)
      .order("nome");

    if (data && data.length > 0) {
      setTurmaDisciplinas(data.map(d => ({
        turma_id: turma.id,
        turma_nome: turma.nome,
        disciplina_id: d.id,
        disciplina_nome: d.nome,
      })));
      setSelectedTurmaForSelector(turma);
      setViewMode("selector");
    } else {
      // If only one or no disciplinas, could show a message
      setTurmaDisciplinas([]);
      setSelectedTurmaForSelector(turma);
      setViewMode("selector");
    }
  };

  // Show selector (using fetched disciplinas for the turma)
  if (viewMode === "selector" && selectedTurmaForSelector) {
    return (
      <TurmaDisciplinaSelector
        turmas={turmaDisciplinas}
        professorNome={professorNome}
        onSelect={(turmaId, disciplinaId, turmaNome, disciplinaNome) => {
          setEntryParams({ turmaId, disciplinaId, turmaNome, disciplinaNome });
          setViewMode("entry");
        }}
        onBack={() => {
          setSelectedTurmaForSelector(null);
          setTurmaDisciplinas([]);
          setViewMode("dashboard");
        }}
      />
    );
  }

  // Show grade entry
  if (viewMode === "entry" && entryParams) {
    return (
      <GradeEntry
        onBack={() => {
          if (selectedTurmaForSelector) {
            setViewMode("selector");
          } else {
            setViewMode("dashboard");
          }
        }}
        turmaId={entryParams.turmaId}
        disciplinaId={entryParams.disciplinaId}
        turmaNome={entryParams.turmaNome}
        disciplinaNome={entryParams.disciplinaNome}
      />
    );
  }

  // Dashboard
  const filteredData = dashboardStudents.filter(item =>
    item.student.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const classAverage = dashboardStudents.length > 0
    ? dashboardStudents.reduce((sum, student) => sum + calculateStudentOverallAverage(student.grades), 0) / dashboardStudents.length
    : 0;
  
  const studentsAbove7 = dashboardStudents.filter(student => 
    calculateStudentOverallAverage(student.grades) >= 7.0).length;
  
  const percentAbove7 = dashboardStudents.length > 0
    ? Math.round((studentsAbove7 / dashboardStudents.length) * 100)
    : 0;
  
  const allGradeValues = dashboardStudents.flatMap(student => Object.values(student.grades).flat());
  const highestGrade = allGradeValues.length > 0 ? Math.max(...allGradeValues) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Notas</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho acadêmico</p>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className="bg-primary hover:bg-primary/90"
                disabled={hasPending}
              >
                {hasPending ? (
                  <Lock className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Lançar Notas
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Selecione a Turma
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {activeTurmas.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                  Nenhuma turma ativa encontrada
                </div>
              ) : (
                activeTurmas.map((turma) => (
                  <DropdownMenuItem
                    key={turma.id}
                    onClick={() => handleTurmaSelect(turma)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{turma.nome}</span>
                      {turma.curso && (
                        <span className="text-xs text-muted-foreground">{turma.curso}</span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Lock Banner */}
      {hasPending && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Lançamento de notas bloqueado
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Existem {pendingCount} aula{pendingCount > 1 ? "s" : ""} pendente{pendingCount > 1 ? "s" : ""} de aceite no cronograma.
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/aceite-cronograma">Ir para Aceite</Link>
            </Button>
          </div>
        </Card>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{classAverage.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Média Geral</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{percentAbove7}%</p>
              <p className="text-sm text-muted-foreground">Acima de 7.0</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{highestGrade.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Maior Nota</p>
            </div>
          </div>
        </Card>
      </div>

      {loadingDashboard ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : dashboardStudents.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <Award className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Nenhuma nota lançada ainda. Clique em "Lançar Notas" para começar.
          </p>
        </Card>
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por estudante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 max-w-sm"
            />
          </div>

          {/* Main Content */}
          <div className="flex gap-6">
            <Card className={`gradient-card shadow-card border-0 overflow-hidden flex-1 transition-all duration-300 ${selectedStudent ? 'max-w-[calc(100%-380px)]' : ''}`}>
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-foreground">Boletim</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-4 font-semibold text-foreground">Estudante</th>
                      {subjects.map(subject => (
                        <th key={subject} className="text-center p-4 font-semibold text-foreground min-w-[140px]">
                          {subject}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => (
                      <tr 
                        key={item.id} 
                        className={`border-b cursor-pointer transition-all duration-200 ${
                          selectedStudent?.id === item.id 
                            ? 'bg-primary/10' 
                            : 'hover:bg-muted/20'
                        }`}
                        onClick={() => setSelectedStudent(selectedStudent?.id === item.id ? null : item)}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                              getGradeColor(calculateStudentOverallAverage(item.grades)) === 'success' ? 'bg-success' :
                              getGradeColor(calculateStudentOverallAverage(item.grades)) === 'warning' ? 'bg-warning' : 'bg-destructive'
                            }`}>
                              {item.student.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </div>
                            <span className="font-medium text-foreground">{item.student}</span>
                          </div>
                        </td>
                        
                        {subjects.map(subject => {
                          const subjectGrades = item.grades[subject] || [];
                          if (subjectGrades.length === 0) {
                            return (
                              <td key={subject} className="p-4 text-center text-muted-foreground text-xs">
                                —
                              </td>
                            );
                          }
                          const average = calculateAverage(subjectGrades);
                          const color = getGradeColor(average);
                          
                          return (
                            <td key={subject} className="p-4">
                              <GradeBarChart 
                                grades={subjectGrades} 
                                color={color}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {selectedStudent && (
              <StudentGradesFlyout
                student={selectedStudent}
                subjects={subjects}
                classAverage={classAverage}
                onClose={() => setSelectedStudent(null)}
                calculateAverage={calculateAverage}
                calculateStudentOverallAverage={calculateStudentOverallAverage}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
