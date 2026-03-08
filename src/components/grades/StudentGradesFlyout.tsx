import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { X, Trophy, TrendingUp, TrendingDown, Medal, FileText, CheckCircle, Clock, XCircle, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface StudentData {
  id: string;
  student: string;
  matricula: string;
  grades: Record<string, number[]>;
  turmaId?: string;
}

interface StudentGradesFlyoutProps {
  student: StudentData;
  subjects: string[];
  classAverage: number;
  allStudents: StudentData[];
  onClose: () => void;
  calculateAverage: (grades: number[]) => number;
  calculateStudentOverallAverage: (grades: Record<string, number[]>) => number;
}

export const StudentGradesFlyout = ({
  student,
  subjects,
  classAverage,
  allStudents,
  onClose,
  calculateAverage,
  calculateStudentOverallAverage
}: StudentGradesFlyoutProps) => {
  const { user } = useAuth();
  const studentAverage = calculateStudentOverallAverage(student.grades);
  const isAboveAverage = studentAverage >= classAverage;

  // Real ranking
  const rankedStudents = [...allStudents]
    .map(s => ({
      id: s.id,
      average: calculateStudentOverallAverage(s.grades),
    }))
    .filter(s => s.average > 0)
    .sort((a, b) => b.average - a.average);

  const ranking = rankedStudents.findIndex(s => s.id === student.id) + 1;
  const totalStudents = rankedStudents.length;

  // Frequency integration
  const [frequencyData, setFrequencyData] = useState<{ present: number; absent: number; late: number; total: number } | null>(null);

  useEffect(() => {
    const fetchFrequency = async () => {
      if (!user || !student.id) return;
      
      const { data } = await supabase
        .from("presencas")
        .select("status")
        .eq("user_id", user.id)
        .eq("student_id", student.id);

      if (data) {
        setFrequencyData({
          present: data.filter(p => p.status === "presente").length,
          absent: data.filter(p => p.status === "ausente").length,
          late: data.filter(p => p.status === "atrasado").length,
          total: data.length,
        });
      }
    };

    fetchFrequency();
  }, [user, student.id]);

  const frequencyPercent = frequencyData && frequencyData.total > 0
    ? Math.round((frequencyData.present / frequencyData.total) * 100)
    : null;

  // Comparative chart data (student vs class by subject)
  const subjectComparison = subjects.map(subject => {
    const studentGrades = student.grades[subject] || [];
    const studentAvg = calculateAverage(studentGrades);

    // Class average for this subject
    const classSubjectAvg = allStudents.length > 0
      ? allStudents.reduce((sum, s) => {
          const grades = s.grades[subject] || [];
          return sum + calculateAverage(grades);
        }, 0) / allStudents.filter(s => (s.grades[subject] || []).length > 0).length || 0
      : 0;

    return { subject, studentAvg, classAvg: classSubjectAvg };
  }).filter(s => s.studentAvg > 0);

  // Performance by evaluation
  const evaluationLabels = ["Av1", "Av2", "Av3", "Av4"];
  const evaluationAverages = evaluationLabels.map((_, idx) => {
    const gradesAtIndex = subjects.map(subject => student.grades[subject]?.[idx] || 0).filter(g => g > 0);
    return gradesAtIndex.length > 0 ? gradesAtIndex.reduce((a, b) => a + b, 0) / gradesAtIndex.length : 0;
  });

  // Export individual report
  const handleExportIndividual = () => {
    const content = `
BOLETIM INDIVIDUAL
==================

Aluno: ${student.student}
Matrícula: ${student.matricula}
Data: ${new Date().toLocaleDateString("pt-BR")}

RESUMO
------
Média Geral: ${studentAverage.toFixed(1)}
Ranking: ${ranking}º de ${totalStudents}
Situação: ${studentAverage >= 7.0 ? "APROVADO" : studentAverage >= 5.0 ? "RECUPERAÇÃO" : "REPROVADO"}
${frequencyData ? `Frequência: ${frequencyPercent}% (${frequencyData.present} presenças, ${frequencyData.absent} faltas, ${frequencyData.late} atrasos)` : ""}

NOTAS POR DISCIPLINA
---------------------
${subjects.map(sub => {
  const grades = student.grades[sub] || [];
  if (grades.length === 0) return `${sub}: Sem notas`;
  return `${sub}: ${grades.map(g => g.toFixed(1)).join(", ")} — Média: ${calculateAverage(grades).toFixed(1)}`;
}).join("\n")}

DESEMPENHO POR AVALIAÇÃO
-------------------------
${evaluationLabels.map((label, idx) => `${label}: ${evaluationAverages[idx] > 0 ? evaluationAverages[idx].toFixed(1) : "—"}`).join("\n")}

Comparação com média da turma: ${isAboveAverage ? "ACIMA" : "ABAIXO"} (Turma: ${classAverage.toFixed(1)})
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `boletim_${student.student.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Boletim individual exportado!");
  };

  return (
    <Card className="w-[380px] gradient-card shadow-card border-0 overflow-hidden animate-in slide-in-from-right-5 duration-300">
      <ScrollArea className="h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">{student.student}</h3>
            <p className="text-sm text-muted-foreground">Matrícula {student.matricula}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleExportIndividual} title="Exportar boletim">
              <FileText className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Média Individual + Real Ranking */}
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground mb-1">Média Individual</p>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-bold text-primary">{studentAverage.toFixed(1)}</span>
            <div className="flex items-center gap-2">
              {ranking <= 3 ? (
                <span className="text-lg">{ranking === 1 ? "🥇" : ranking === 2 ? "🥈" : "🥉"}</span>
              ) : (
                <Medal className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="text-sm font-medium text-muted-foreground">
                {ranking > 0 ? `${ranking}º / ${totalStudents}` : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Frequency Integration */}
        {frequencyData && frequencyData.total > 0 && (
          <div className="p-4 border-b">
            <p className="text-sm text-muted-foreground mb-2">Frequência</p>
            <div className="flex items-center gap-2 mb-2">
              <Progress 
                value={frequencyPercent || 0} 
                className={`h-2 flex-1 ${(frequencyPercent || 0) < 75 ? "[&>div]:bg-red-500" : ""}`}
              />
              <span className={`text-sm font-bold ${(frequencyPercent || 0) < 75 ? "text-red-500" : "text-green-500"}`}>
                {frequencyPercent}%
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500" /> {frequencyData.present}
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="w-3 h-3 text-red-500" /> {frequencyData.absent}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-yellow-500" /> {frequencyData.late}
              </span>
            </div>
          </div>
        )}

        {/* Comparative Chart by Subject */}
        {subjectComparison.length > 0 && (
          <div className="p-4 border-b">
            <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Comparativo por Disciplina
            </p>
            <div className="space-y-3">
              {subjectComparison.map(({ subject, studentAvg, classAvg }) => (
                <div key={subject} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[120px]">{subject}</span>
                    <span className="font-medium">{studentAvg.toFixed(1)} <span className="text-muted-foreground">/ {classAvg.toFixed(1)}</span></span>
                  </div>
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    {/* Class avg marker */}
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-muted-foreground/50 z-10"
                      style={{ left: `${(classAvg / 10) * 100}%` }}
                    />
                    {/* Student bar */}
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        studentAvg >= 7.5 ? "bg-green-500" : studentAvg >= 6.0 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${(studentAvg / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-3 h-2 bg-primary rounded-sm" /> Aluno
              </span>
              <span className="flex items-center gap-1">
                <div className="w-px h-3 bg-muted-foreground/50" /> Média da Turma
              </span>
            </div>
          </div>
        )}

        {/* Desempenho por Avaliação */}
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground mb-3">Desempenho por Avaliação</p>
          <div className="space-y-2">
            {evaluationLabels.map((label, idx) => {
              const avg = evaluationAverages[idx];
              if (avg === 0) return null;
              const widthPercent = (avg / 10) * 100;
              const color = avg >= 7.5 ? 'bg-green-500' : avg >= 6.0 ? 'bg-yellow-500' : 'bg-red-500';
              
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-6">{label}</span>
                  <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                    <div 
                      className={`h-full ${color} transition-all duration-500`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-foreground w-8">{avg.toFixed(1)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Evolução (Tendência) */}
        <div className="p-4 border-b">
          <p className="text-sm text-muted-foreground mb-3">Evolução (Tendência)</p>
          <div className="h-20 flex items-end justify-between gap-1">
            {subjects.map((subject, idx) => {
              const grades = student.grades[subject] || [];
              const avg = calculateAverage(grades);
              if (avg === 0) return null;
              const heightPercent = (avg / 10) * 100;
              const color = avg >= 7.5 ? 'bg-green-500' : avg >= 6.0 ? 'bg-yellow-500' : 'bg-red-500';
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={`w-full ${color} rounded-t-sm transition-all duration-300`}
                    style={{ height: `${heightPercent}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate max-w-full">
                    {subject.substring(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparação Média da Turma */}
        <div className="p-4">
          <p className="text-sm text-muted-foreground mb-2">Comparação Média da Turma</p>
          <div className="flex items-center gap-2">
            {isAboveAverage ? (
              <>
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-500">Acima da Média</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-500">Abaixo da Média</span>
              </>
            )}
          </div>
          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden relative">
            <div 
              className="absolute top-0 h-full w-0.5 bg-muted-foreground/70 z-10"
              style={{ left: `${(classAverage / 10) * 100}%` }}
            />
            <div 
              className={`h-full ${isAboveAverage ? 'bg-green-500' : 'bg-red-500'} transition-all duration-500`}
              style={{ width: `${(studentAverage / 10) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>0</span>
            <span>{classAverage.toFixed(1)}</span>
            <span>10</span>
          </div>
        </div>

        {/* Status Badge */}
        <div className="px-4 pb-4">
          <div className={`w-full py-2 px-4 rounded-lg text-center text-sm font-medium ${
            studentAverage >= 7.0 
              ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300' 
              : studentAverage >= 5.0
              ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300'
              : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300'
          }`}>
            {studentAverage >= 7.0 ? 'Aprovado' : studentAverage >= 5.0 ? 'Em Recuperação' : 'Reprovado'}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};
