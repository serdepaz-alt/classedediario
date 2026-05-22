import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  GraduationCap,
  Users,
  TrendingDown,
  Medal,
  FileText,
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
import { toast } from "sonner";

interface DashboardStudent {
  id: string;
  student: string;
  matricula: string;
  grades: Record<string, number[]>;
  turmaId?: string;
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

  // Filter by turma
  const [filterTurmaId, setFilterTurmaId] = useState<string>("all");

  // Active turmas for dropdown
  const [activeTurmas, setActiveTurmas] = useState<{ id: string; nome: string; curso: string | null }[]>([]);

  // Real dashboard data
  const [dashboardStudents, setDashboardStudents] = useState<DashboardStudent[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // Ranking (must be declared before any conditional early return to keep hook order stable)
  const filteredByTurmaMemo = useMemo(() => {
    return filterTurmaId === "all"
      ? dashboardStudents
      : dashboardStudents.filter(s => s.turmaId === filterTurmaId);
  }, [dashboardStudents, filterTurmaId]);

  const rankedStudents = useMemo(() => {
    const calcAvg = (g: number[]) => g.length === 0 ? 0 : g.reduce((a, b) => a + b, 0) / g.length;
    return [...filteredByTurmaMemo]
      .map(s => ({
        ...s,
        average: calcAvg(Object.values(s.grades).flat()),
      }))
      .filter(s => s.average > 0)
      .sort((a, b) => b.average - a.average)
      .map((s, i) => ({ ...s, rank: i + 1 }));
  }, [filteredByTurmaMemo]);

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

  // Load grades for a selected turma only
  const loadTurmaData = useCallback(async (turmaId: string) => {
    setLoadingDashboard(true);
    const studentMap = new Map<string, DashboardStudent>();
    const subjectSet = new Set<string>();

    const { data: disciplinas } = await supabase
      .from("disciplinas")
      .select("id, nome")
      .eq("turma_id", turmaId);

    if (!disciplinas || disciplinas.length === 0) {
      setDashboardStudents([]);
      setSubjects([]);
      setLoadingDashboard(false);
      return;
    }

    for (const disc of disciplinas) {
      const allGrades = await fetchAllGradesForDisciplina(disc.id);
      subjectSet.add(disc.nome);

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
            turmaId: turmaId,
          });
        }

        const s = studentMap.get(key)!;
        if (!s.grades[disc.nome]) s.grades[disc.nome] = [];
        if (nota.valor !== null) {
          s.grades[disc.nome].push(nota.valor);
        }
      }
    }

    setSubjects(Array.from(subjectSet));
    setDashboardStudents(Array.from(studentMap.values()));
    setLoadingDashboard(false);
  }, [fetchAllGradesForDisciplina]);

  useEffect(() => {
    if (filterTurmaId === "all") {
      setDashboardStudents([]);
      setSubjects([]);
      return;
    }
    loadTurmaData(filterTurmaId);
  }, [filterTurmaId, loadTurmaData]);

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
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from("disciplinas")
      .select("id, nome")
      .eq("turma_id", turma.id)
      .lte("data_inicio", today)
      .gte("data_termino", today)
      .order("nome");

    if (data && data.length > 0) {
      setTurmaDisciplinas(data.map(d => ({
        turma_id: turma.id,
        turma_nome: turma.nome,
        disciplina_id: d.id,
        disciplina_nome: d.nome,
      })));
    } else {
      setTurmaDisciplinas([]);
    }
    setSelectedTurmaForSelector(turma);
    setViewMode("selector");
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

  // Filtered data
  const filteredByTurma = filterTurmaId === "all"
    ? dashboardStudents
    : dashboardStudents.filter(s => s.turmaId === filterTurmaId);

  const filteredData = filteredByTurma.filter(item =>
    item.student.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPIs
  const classAverage = filteredByTurma.length > 0
    ? filteredByTurma.reduce((sum, student) => sum + calculateStudentOverallAverage(student.grades), 0) / filteredByTurma.length
    : 0;
  
  const studentsApproved = filteredByTurma.filter(student => 
    calculateStudentOverallAverage(student.grades) >= 6.0).length;
  
  const percentApproved = filteredByTurma.length > 0
    ? Math.round((studentsApproved / filteredByTurma.length) * 100)
    : 0;
  
  const allGradeValues = filteredByTurma.flatMap(student => Object.values(student.grades).flat());
  const highestGrade = allGradeValues.length > 0 ? Math.max(...allGradeValues) : 0;

  // Avaliação Final: avg >= 5.0 && < 6.0
  const studentsInAvaliacaoFinal = filteredByTurma.filter(s => {
    const avg = calculateStudentOverallAverage(s.grades);
    return avg >= 5.0 && avg < 6.0;
  }).length;

  // Mantido: avg > 0 && < 5.0
  const studentsMantido = filteredByTurma.filter(s => {
    const avg = calculateStudentOverallAverage(s.grades);
    return avg > 0 && avg < 5.0;
  }).length;

  const getRank = (studentId: string) => {
    const found = rankedStudents.find(s => s.id === studentId);
    return found ? found.rank : null;
  };

  // Export PDF
  const handleExportPDF = () => {
    const turmaName = filterTurmaId === "all"
      ? "Todas as Turmas"
      : activeTurmas.find(t => t.id === filterTurmaId)?.nome || "Turma";

    const content = `
BOLETIM ESCOLAR
===============

Turma: ${turmaName}
Data: ${new Date().toLocaleDateString("pt-BR")}

RESUMO
------
Média Geral: ${classAverage.toFixed(1)}
Aprovados (≥6.0): ${percentApproved}%
Avaliação Final: ${studentsInAvaliacaoFinal}
Mantidos: ${studentsMantido}
Maior Nota: ${highestGrade.toFixed(1)}

RANKING DOS ALUNOS
------------------
${rankedStudents.map((s, i) => `${i + 1}º - ${s.student} (${s.matricula}): Média ${s.average.toFixed(1)}`).join("\n")}

DETALHAMENTO POR DISCIPLINA
----------------------------
${filteredByTurma.map(s => {
  const avg = calculateStudentOverallAverage(s.grades);
  const status = avg >= 6.0 ? "APROVADO" : avg >= 5.0 ? "AVALIAÇÃO FINAL" : avg > 0 ? "MANTIDO" : "SEM NOTAS";
  const detalhes = subjects.map(sub => {
    const grades = s.grades[sub] || [];
    return grades.length > 0 ? `  ${sub}: ${grades.map(g => g.toFixed(1)).join(", ")} (Média: ${calculateAverage(grades).toFixed(1)})` : `  ${sub}: —`;
  }).join("\n");
  return `\n${s.student} (${s.matricula}) — ${status} — Média: ${avg.toFixed(1)}\n${detalhes}`;
}).join("\n")}
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `boletim_${turmaName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Boletim exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
          <Button variant="outline" onClick={handleExportPDF}>
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

      {/* Turma Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterTurmaId} onValueChange={setFilterTurmaId}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Filtrar por turma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Turmas</SelectItem>
            {activeTurmas.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome} {t.curso ? `(${t.curso})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterTurmaId !== "all" && (
          <Badge variant="outline" className="text-xs">
            {filteredByTurma.length} alunos
          </Badge>
        )}
      </div>

      {/* Stats Overview - 5 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{classAverage.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Média Geral</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{percentApproved}%</p>
              <p className="text-xs text-muted-foreground">Aprovados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{studentsInAvaliacaoFinal}</p>
              <p className="text-xs text-muted-foreground">Avaliação Final</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{studentsMantido}</p>
              <p className="text-xs text-muted-foreground">Mantidos</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{highestGrade.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Maior Nota</p>
            </div>
          </div>
        </Card>
      </div>

      {loadingDashboard ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : dashboardStudents.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma turma selecionada</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Selecione uma turma no filtro acima para carregar os boletins dos alunos.
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
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Boletim</h3>
                <Badge variant="outline" className="text-xs">
                  <Users className="w-3 h-3 mr-1" />
                  {filteredData.length} alunos
                </Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-center p-4 font-semibold text-foreground w-12">#</th>
                      <th className="text-left p-4 font-semibold text-foreground">Estudante</th>
                      {subjects.map(subject => (
                        <th key={subject} className="text-center p-4 font-semibold text-foreground min-w-[140px]">
                          {subject}
                        </th>
                      ))}
                      <th className="text-center p-4 font-semibold text-foreground w-[80px]">Média</th>
                      <th className="text-center p-4 font-semibold text-foreground w-[100px]">Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item) => {
                      const avg = calculateStudentOverallAverage(item.grades);
                      const rank = getRank(item.id);
                      const status = avg >= 6.0 ? "Aprovado" : avg >= 5.0 ? "Avaliação Final" : avg > 0 ? "Mantido" : "—";

                      return (
                        <tr 
                          key={item.id} 
                          className={`border-b cursor-pointer transition-all duration-200 ${
                            selectedStudent?.id === item.id 
                              ? 'bg-primary/10' 
                              : 'hover:bg-muted/20'
                          }`}
                          onClick={() => setSelectedStudent(selectedStudent?.id === item.id ? null : item)}
                        >
                          <td className="p-4 text-center">
                            {rank && rank <= 3 ? (
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold ${
                                rank === 1 ? "bg-amber-100 text-amber-700" :
                                rank === 2 ? "bg-gray-100 text-gray-700" :
                                "bg-orange-100 text-orange-700"
                              }`}>
                                {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">{rank || "—"}</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                                getGradeColor(avg) === 'success' ? 'bg-green-500' :
                                getGradeColor(avg) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}>
                                {item.student.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">{item.student}</span>
                                <p className="text-xs text-muted-foreground">{item.matricula}</p>
                              </div>
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

                          <td className="p-4 text-center">
                            <span className={`text-lg font-bold ${
                              avg >= 6.0 ? "text-green-600" : avg >= 5.0 ? "text-yellow-600" : avg > 0 ? "text-red-600" : "text-muted-foreground"
                            }`}>
                              {avg > 0 ? avg.toFixed(1) : "—"}
                            </span>
                          </td>

                          <td className="p-4 text-center">
                            {status !== "—" && (
                              <Badge
                                variant={status === "Aprovado" ? "default" : status === "Avaliação Final" ? "secondary" : "destructive"}
                                className="text-xs"
                              >
                                {status}
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>

            {selectedStudent && (
              <StudentGradesFlyout
                student={selectedStudent}
                subjects={subjects}
                classAverage={classAverage}
                allStudents={filteredByTurma}
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
