import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Award, 
  Download,
  Trophy
} from "lucide-react";
import { StudentGradesFlyout } from "@/components/grades/StudentGradesFlyout";
import { GradeBarChart } from "@/components/grades/GradeBarChart";
import { GradeEntry } from "@/components/grades/GradeEntry";

const subjects = ["Matemática", "Português", "História", "Geografia"];

const gradesData = [
  {
    id: 1,
    student: "Ana Silva",
    matricula: "12345",
    grades: {
      "Matemática": [8.0, 8.5, 7.5, 8.0],
      "Português": [7.5, 8.0, 7.0, 7.5],
      "História": [8.5, 9.0, 8.0, 8.5],
      "Geografia": [7.0, 7.5, 6.5, 7.0]
    }
  },
  {
    id: 2,
    student: "Maria Costa", 
    matricula: "12346",
    grades: {
      "Matemática": [9.0, 9.5, 8.5, 9.0],
      "Português": [8.5, 9.0, 8.0, 8.5],
      "História": [9.5, 9.8, 9.0, 9.5],
      "Geografia": [8.0, 8.5, 7.5, 8.0]
    }
  },
  {
    id: 3,
    student: "Pedro Lima",
    matricula: "12347",
    grades: {
      "Matemática": [6.5, 7.0, 6.0, 6.5],
      "Português": [7.0, 7.5, 6.5, 7.0],
      "História": [6.0, 6.5, 5.5, 6.0],
      "Geografia": [6.5, 7.0, 6.0, 6.5]
    }
  }
];

export const Grades = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<typeof gradesData[0] | null>(null);
  const [showGradeEntry, setShowGradeEntry] = useState(false);

  const calculateAverage = (grades: number[]) => {
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

  const filteredData = gradesData.filter(item =>
    item.student.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate class metrics
  const classAverage = gradesData.reduce((sum, student) => 
    sum + calculateStudentOverallAverage(student.grades), 0) / gradesData.length;
  
  const studentsAbove7 = gradesData.filter(student => 
    calculateStudentOverallAverage(student.grades) >= 7.0).length;
  
  const percentAbove7 = Math.round((studentsAbove7 / gradesData.length) * 100);
  
  const highestGrade = Math.max(...gradesData.flatMap(student => 
    Object.values(student.grades).flat()));

  // Show Grade Entry view
  if (showGradeEntry) {
    return <GradeEntry onBack={() => setShowGradeEntry(false)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Notas</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho acadêmico</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setShowGradeEntry(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Lançar Notas
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">{classAverage.toFixed(1)}</p>
              <p className="text-sm text-muted-foreground">Média da Turma</p>
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

      {/* Main Content - Table and Flyout */}
      <div className="flex gap-6">
        {/* Grades Table */}
        <Card className={`gradient-card shadow-card border-0 overflow-hidden flex-1 transition-all duration-300 ${selectedStudent ? 'max-w-[calc(100%-380px)]' : ''}`}>
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-foreground">Boletim da Turma</h3>
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
                      const subjectGrades = item.grades[subject as keyof typeof item.grades];
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

        {/* Student Flyout */}
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
    </div>
  );
};
