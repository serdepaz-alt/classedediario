import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, BookOpen, Calendar, Clock, GraduationCap } from "lucide-react";

interface TurmaDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  turmaId: string | null;
}

interface Student {
  id: string;
  nome: string;
  matricula: string;
  status: string | null;
}

interface Disciplina {
  id: string;
  nome: string;
  data_inicio: string;
  data_termino: string;
}

export const TurmaDetailsDialog = ({
  open,
  onOpenChange,
  turmaId,
}: TurmaDetailsDialogProps) => {
  const { user } = useAuth();
  const [turma, setTurma] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && turmaId && user) {
      fetchTurmaDetails();
    }
  }, [open, turmaId, user]);

  const fetchTurmaDetails = async () => {
    if (!turmaId || !user) return;

    setIsLoading(true);
    try {
      // Fetch turma
      const { data: turmaData, error: turmaError } = await supabase
        .from("turmas")
        .select("*")
        .eq("id", turmaId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (turmaError) throw turmaError;
      setTurma(turmaData);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, nome, matricula, status")
        .eq("turma_id", turmaId)
        .eq("user_id", user.id)
        .order("nome");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch disciplinas
      const { data: disciplinasData, error: disciplinasError } = await supabase
        .from("disciplinas")
        .select("id, nome, data_inicio, data_termino")
        .eq("turma_id", turmaId)
        .eq("user_id", user.id)
        .order("data_inicio", { ascending: false });

      if (disciplinasError) throw disciplinasError;
      setDisciplinas(disciplinasData || []);
    } catch (error) {
      console.error("Error fetching turma details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "Ativa":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Inativa":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      case "Aguardando":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  if (!turma && !isLoading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="block">{turma?.nome}</span>
              {turma?.curso && (
                <span className="text-sm font-normal text-muted-foreground">
                  {turma.curso}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Info Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Calendar className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-2xl font-bold text-foreground">
                  {turma?.ano_letivo}
                </p>
                <p className="text-xs text-muted-foreground">Ano Letivo</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Clock className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
                <p className="text-lg font-semibold text-foreground">
                  {turma?.periodo || "—"}
                </p>
                <p className="text-xs text-muted-foreground">Turno</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <Badge className={getStatusColor(turma?.status)}>
                  {turma?.status || "—"}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Status</p>
              </div>
            </div>

            {/* Students Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">
                  Estudantes ({students.length})
                </h3>
              </div>
              {students.length > 0 ? (
                <div className="bg-muted/30 rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {student.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Matrícula: {student.matricula}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          student.status === "Ativo"
                            ? "border-green-500/30 text-green-600"
                            : "border-red-500/30 text-red-600"
                        }
                      >
                        {student.status || "Ativo"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  Nenhum estudante cadastrado nesta turma.
                </p>
              )}
            </div>

            {/* Disciplinas Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">
                  Disciplinas ({disciplinas.length})
                </h3>
              </div>
              {disciplinas.length > 0 ? (
                <div className="bg-muted/30 rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                  {disciplinas.map((disciplina) => (
                    <div key={disciplina.id} className="p-3">
                      <p className="font-medium text-foreground">
                        {disciplina.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(disciplina.data_inicio).toLocaleDateString(
                          "pt-BR"
                        )}{" "}
                        até{" "}
                        {new Date(disciplina.data_termino).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                  Nenhuma disciplina cadastrada para esta turma.
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
