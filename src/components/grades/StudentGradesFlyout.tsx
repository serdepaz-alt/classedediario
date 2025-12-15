import { Card } from "@/components/ui/card";
import { X, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StudentData {
  id: number;
  student: string;
  matricula: string;
  grades: Record<string, number[]>;
}

interface StudentGradesFlyoutProps {
  student: StudentData;
  subjects: string[];
  classAverage: number;
  onClose: () => void;
  calculateAverage: (grades: number[]) => number;
  calculateStudentOverallAverage: (grades: Record<string, number[]>) => number;
}

export const StudentGradesFlyout = ({
  student,
  subjects,
  classAverage,
  onClose,
  calculateAverage,
  calculateStudentOverallAverage
}: StudentGradesFlyoutProps) => {
  const studentAverage = calculateStudentOverallAverage(student.grades);
  const isAboveAverage = studentAverage >= classAverage;
  
  // Calculate ranking (simplified - would need all students data for real ranking)
  const ranking = studentAverage >= 8.5 ? 1 : studentAverage >= 7.5 ? 2 : 3;
  const totalStudents = 40; // Mock total

  // Get trend data (simplified evolution)
  const trendData = subjects.map(subject => {
    const grades = student.grades[subject];
    return calculateAverage(grades);
  });

  // Performance by evaluation
  const evaluationLabels = ["Av1", "Av2", "Av3", "Av4"];
  const evaluationAverages = evaluationLabels.map((_, idx) => {
    const gradesAtIndex = subjects.map(subject => student.grades[subject][idx] || 0);
    return gradesAtIndex.reduce((a, b) => a + b, 0) / gradesAtIndex.length;
  });

  return (
    <Card className="w-[360px] gradient-card shadow-card border-0 overflow-hidden animate-in slide-in-from-right-5 duration-300">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{student.student}</h3>
          <p className="text-sm text-muted-foreground">Matrícula {student.matricula}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Média Individual */}
      <div className="p-4 border-b">
        <p className="text-sm text-muted-foreground mb-1">Média Individual</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-4xl font-bold text-primary">{studentAverage.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium text-muted-foreground">{ranking}º / {totalStudents}</span>
          </div>
        </div>
      </div>

      {/* Desempenho por Avaliação */}
      <div className="p-4 border-b">
        <p className="text-sm text-muted-foreground mb-3">Desempenho por Avaliação</p>
        <div className="space-y-2">
          {evaluationLabels.map((label, idx) => {
            const avg = evaluationAverages[idx];
            const widthPercent = (avg / 10) * 100;
            const color = avg >= 7.5 ? 'bg-success' : avg >= 6.0 ? 'bg-warning' : 'bg-destructive';
            
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
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <div className="w-3 h-3 bg-muted rounded-sm" />
          <span>Média da Turma</span>
        </div>
      </div>

      {/* Evolução (Tendência) */}
      <div className="p-4 border-b">
        <p className="text-sm text-muted-foreground mb-3">Evolução (Tendência)</p>
        <div className="h-20 flex items-end justify-between gap-1">
          {trendData.map((avg, idx) => {
            const heightPercent = (avg / 10) * 100;
            const color = avg >= 7.5 ? 'bg-success' : avg >= 6.0 ? 'bg-warning' : 'bg-destructive';
            
            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                <div 
                  className={`w-full ${color} rounded-t-sm transition-all duration-300`}
                  style={{ height: `${heightPercent}%` }}
                />
                <span className="text-[10px] text-muted-foreground truncate max-w-full">
                  {subjects[idx].substring(0, 3)}
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
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-sm font-medium text-success">Acima da Média</span>
            </>
          ) : (
            <>
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Abaixo da Média</span>
            </>
          )}
        </div>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full ${isAboveAverage ? 'bg-success' : 'bg-destructive'} transition-all duration-500`}
            style={{ width: `${(studentAverage / 10) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>0</span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-muted-foreground/50 rounded-full" />
            {classAverage.toFixed(1)}
          </span>
          <span>10</span>
        </div>
      </div>

      {/* Status Badge */}
      <div className="px-4 pb-4">
        <div className={`w-full py-2 px-4 rounded-lg text-center text-sm font-medium ${
          isAboveAverage 
            ? 'bg-success/10 text-success' 
            : 'bg-destructive/10 text-destructive'
        }`}>
          {studentAverage >= 7.0 ? 'Aprovado' : 'Em Recuperação'}
        </div>
      </div>
    </Card>
  );
};
