import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  Award, 
  BookOpen,
  Filter,
  Download 
} from "lucide-react";

const subjects = ["Matemática", "Português", "História", "Geografia", "Ciências"];

const gradesData = [
  {
    id: 1,
    student: "Ana Silva",
    grades: {
      "Matemática": [9.5, 8.8, 9.2],
      "Português": [9.0, 9.3, 8.7],
      "História": [8.5, 9.0, 8.8],
      "Geografia": [9.2, 8.9, 9.1],
      "Ciências": [9.8, 9.5, 9.6]
    }
  },
  {
    id: 2,
    student: "João Santos", 
    grades: {
      "Matemática": [8.2, 8.5, 7.9],
      "Português": [8.0, 8.3, 8.1],
      "História": [7.8, 8.2, 8.0],
      "Geografia": [8.1, 7.9, 8.3],
      "Ciências": [8.4, 8.7, 8.2]
    }
  },
  {
    id: 3,
    student: "Maria Costa",
    grades: {
      "Matemática": [9.8, 9.9, 9.7],
      "Português": [9.5, 9.8, 9.6],
      "História": [9.3, 9.7, 9.4],
      "Geografia": [9.6, 9.4, 9.8],
      "Ciências": [9.9, 9.8, 9.9]
    }
  },
  {
    id: 4,
    student: "Pedro Lima",
    grades: {
      "Matemática": [7.2, 7.5, 6.8],
      "Português": [7.0, 7.3, 7.1],
      "História": [6.8, 7.2, 7.0],
      "Geografia": [7.1, 6.9, 7.3],
      "Ciências": [7.4, 7.7, 7.2]
    }
  }
];

export const Grades = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("Todas");

  const calculateAverage = (grades: number[]) => {
    return grades.reduce((sum, grade) => sum + grade, 0) / grades.length;
  };

  const calculateStudentOverallAverage = (studentGrades: any) => {
    const allGrades = Object.values(studentGrades).flat() as number[];
    return calculateAverage(allGrades);
  };

  const getPerformanceIcon = (average: number) => {
    if (average >= 9) return { icon: Award, color: "text-success" };
    if (average >= 8) return { icon: TrendingUp, color: "text-primary" };
    if (average >= 7) return { icon: TrendingUp, color: "text-warning" };
    return { icon: TrendingDown, color: "text-destructive" };
  };

  const getGradeBadge = (grade: number) => {
    if (grade >= 9) return "default";
    if (grade >= 7) return "secondary";
    return "destructive";
  };

  const filteredData = gradesData.filter(item =>
    item.student.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Notas</h1>
          <p className="text-muted-foreground">Acompanhe o desempenho acadêmico</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
          <Button variant="hero" size="lg">
            <Plus className="w-5 h-5" />
            Lançar Nota
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">8.7</p>
              <p className="text-sm text-muted-foreground">Média da Turma</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">78%</p>
              <p className="text-sm text-muted-foreground">Acima de 7.0</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">9.8</p>
              <p className="text-sm text-muted-foreground">Maior Nota</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">5</p>
              <p className="text-sm text-muted-foreground">Matérias</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 gradient-card shadow-card border-0">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por estudante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Matéria:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="Todas">Todas</option>
              {subjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>
      </Card>

      {/* Grades Table */}
      <Card className="gradient-card shadow-card border-0 overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-foreground">Boletim da Turma</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-semibold text-foreground">Estudante</th>
                {subjects.map(subject => (
                  <th key={subject} className="text-center p-4 font-semibold text-foreground min-w-[120px]">
                    {subject}
                  </th>
                ))}
                <th className="text-center p-4 font-semibold text-foreground">Média Geral</th>
                <th className="text-center p-4 font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => {
                const overallAverage = calculateStudentOverallAverage(item.grades);
                const performanceIcon = getPerformanceIcon(overallAverage);
                const PerformanceIcon = performanceIcon.icon;

                return (
                  <tr key={item.id} className="border-b hover:bg-muted/20 transition-smooth">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {item.student.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <span className="font-medium text-foreground">{item.student}</span>
                      </div>
                    </td>
                    
                    {subjects.map(subject => {
                      const subjectGrades = item.grades[subject as keyof typeof item.grades];
                      const average = calculateAverage(subjectGrades);
                      
                      return (
                        <td key={subject} className="p-4 text-center">
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1">
                              {subjectGrades.map((grade, index) => (
                                <Badge 
                                  key={index} 
                                  variant={getGradeBadge(grade) as any}
                                  className="text-xs px-2 py-0"
                                >
                                  {grade.toFixed(1)}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                              Média: {average.toFixed(1)}
                            </p>
                          </div>
                        </td>
                      );
                    })}
                    
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <PerformanceIcon className={`w-4 h-4 ${performanceIcon.color}`} />
                        <span className={`text-lg font-bold ${performanceIcon.color}`}>
                          {overallAverage.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-4 text-center">
                      <Badge variant={overallAverage >= 7 ? "default" : "destructive"}>
                        {overallAverage >= 7 ? "Aprovado" : "Recuperação"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};