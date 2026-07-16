import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Mail, 
  Phone, 
  MapPin,
  GraduationCap,
  BookOpen,
  Pencil,
  Send,
  Loader2,
  Printer,
  FileText,
  Award,
  ScrollText,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AddStudentDialog } from "./students/AddStudentDialog";
import { StudentData } from "./students/IndividualStudentForm";
import { printFichaMatricula, printContratoMatricula } from "@/lib/studentDocuments";
import { toast } from "sonner";

export const Students = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [turmaFilter, setTurmaFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentData | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleEnviarEvolucao = async (studentId: string, email: string, nome: string) => {
    if (!email) {
      toast.warning("Aluno sem e-mail cadastrado.");
      return;
    }
    setSendingId(studentId);
    try {
      const { error } = await supabase.functions.invoke("send-evolucao-email", {
        body: { to: email, studentId, data: { studentName: nome } },
      });
      if (error) throw error;
      toast.success(`Evolução enviada para ${nome}.`);
    } catch (e: any) {
      toast.error(`Falha ao enviar: ${e.message ?? e}`);
    } finally {
      setSendingId(null);
    }
  };

  const { data: dbStudents = [], refetch } = useQuery({
    queryKey: ["students", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("students")
        .select("*, turmas(id, nome, curso, periodo, horario)")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Only show real data from database — no mock fallback
  const students = dbStudents.map(s => ({
    id: s.id,
    name: s.nome,
    email: s.email || "",
    phone: s.telefone || "",
    address: s.endereco || "",
    average: 0, // TODO: Calculate from grades
    attendance: 0, // TODO: Calculate from attendance
    status: s.status || "Ativo",
    joinDate: s.data_matricula,
    turma: s.turmas ? `${s.turmas.nome}${s.turmas.curso ? ` - ${s.turmas.curso}` : ""}` : null,
    turmaId: s.turmas?.id ?? null,
    turmaRaw: s.turmas ?? null,
    // Keep raw data for editing
    rawData: s,
  }));

  const turmaOptions = Array.from(
    new Map(
      students
        .filter(s => s.turmaId && s.turma)
        .map(s => [s.turmaId as string, s.turma as string])
    ).entries()
  ).sort((a, b) => a[1].localeCompare(b[1]));

  const handleEditStudent = (studentRaw: any) => {
    if (!studentRaw) return;
    const studentData: StudentData = {
      id: studentRaw.id,
      matricula: studentRaw.matricula,
      nome: studentRaw.nome,
      turma_id: studentRaw.turma_id,
      data_nascimento: studentRaw.data_nascimento,
      cpf: studentRaw.cpf,
      rg: studentRaw.rg,
      titulo_eleitoral: studentRaw.titulo_eleitoral,
      local_nascimento: studentRaw.local_nascimento,
      estado_nascimento: studentRaw.estado_nascimento,
      nome_pai: studentRaw.nome_pai,
      nome_mae: studentRaw.nome_mae,
      telefone: studentRaw.telefone,
      email: studentRaw.email,
      endereco: studentRaw.endereco,
      data_matricula: studentRaw.data_matricula,
    };
    setEditingStudent(studentData);
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingStudent(null);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTurma =
      turmaFilter === "all" ||
      (turmaFilter === "none" ? !student.turmaId : student.turmaId === turmaFilter);
    return matchesSearch && matchesTurma;
  });

  const getPerformanceColor = (average: number) => {
    if (average >= 9) return "text-success";
    if (average >= 7) return "text-warning";
    return "text-destructive";
  };

  const getPerformanceBadge = (average: number) => {
    if (average >= 9) return { label: "Excelente", variant: "default" as const };
    if (average >= 7) return { label: "Bom", variant: "secondary" as const };
    return { label: "Precisa Melhorar", variant: "destructive" as const };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Estudantes</h1>
          <p className="text-muted-foreground">Gerencie seus alunos</p>
        </div>
        <Button variant="hero" size="lg" onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-5 h-5" />
          Adicionar Estudante
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 gradient-card shadow-card border-0">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={turmaFilter} onValueChange={setTurmaFilter}>
            <SelectTrigger className="w-[260px]">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <SelectValue placeholder="Filtrar por turma" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              <SelectItem value="none">Sem turma</SelectItem>
              {turmaOptions.map(([id, label]) => (
                <SelectItem key={id} value={id}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Students Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredStudents.map((student) => {
          const performanceBadge = getPerformanceBadge(student.average);
          
          return (
            <Card key={student.id} className="p-6 gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 bg-primary/10">
                    <div className="w-full h-full flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{student.name}</h3>
                    <Badge variant={performanceBadge.variant} className="text-xs">
                      {performanceBadge.label}
                    </Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      Imprimir
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => printFichaMatricula(student.rawData, student.turmaRaw)}
                      disabled={!student.rawData}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Ficha de Matrícula
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => printContratoMatricula(student.rawData, student.turmaRaw)}
                      disabled={!student.rawData}
                    >
                      <ScrollText className="w-4 h-4 mr-2" />
                      Contrato de Matrícula
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => window.open("/atestado-matricula", "_blank")}
                    >
                      <Award className="w-4 h-4 mr-2" />
                      Atestado de Matrícula
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => window.print()}
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Ficha Resumo (tela)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {student.email || "Sem email"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  {student.phone || "Sem telefone"}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {student.address || "Sem endereço"}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className={student.turma ? "text-foreground font-medium" : "text-muted-foreground italic"}>
                    {student.turma || "Sem turma associada"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className={`text-2xl font-bold ${getPerformanceColor(student.average)}`}>
                    {student.average}
                  </p>
                  <p className="text-xs text-muted-foreground">Média Geral</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">
                    {student.attendance}%
                  </p>
                  <p className="text-xs text-muted-foreground">Presença</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEnviarEvolucao(student.id, student.email, student.name)}
                  disabled={!student.email || sendingId === student.id}
                  title={student.email ? "Enviar Evolução Pedagógica por e-mail" : "Sem e-mail cadastrado"}
                >
                  {sendingId === student.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  Enviar Evolução
                </Button>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleEditStudent(student.rawData)}
                  disabled={!student.rawData}
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => printFichaMatricula(student.rawData, student.turmaRaw)}
                  title="Imprimir ficha de matrícula"
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Ficha de Matrícula
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => printContratoMatricula(student.rawData, student.turmaRaw)}
                  title="Imprimir contrato de prestação de serviços"
                >
                  <FileText className="w-4 h-4 mr-1" />
                  Contrato
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <Card className="p-12 text-center gradient-card shadow-card border-0">
          <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhum estudante encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Tente ajustar sua busca" : "Comece adicionando seu primeiro estudante"}
          </p>
          <Button variant="gradient" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Adicionar Estudante
          </Button>
        </Card>
      )}

      <AddStudentDialog 
        open={isDialogOpen} 
        onOpenChange={handleDialogClose}
        onSuccess={refetch}
        student={editingStudent}
      />
    </div>
  );
};