import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, ChevronRight, ArrowLeft } from "lucide-react";

interface TurmaOption {
  turma_id: string;
  turma_nome: string;
  disciplina_id: string;
  disciplina_nome: string;
}

interface TurmaDisciplinaSelectorProps {
  turmas: TurmaOption[];
  onSelect: (turmaId: string, disciplinaId: string, turmaNome: string, disciplinaNome: string) => void;
  onBack: () => void;
  professorNome: string | null;
}

export const TurmaDisciplinaSelector = ({
  turmas,
  onSelect,
  onBack,
  professorNome,
}: TurmaDisciplinaSelectorProps) => {
  // Group by turma
  const grouped = turmas.reduce<Record<string, { turma_nome: string; disciplinas: { id: string; nome: string }[] }>>(
    (acc, item) => {
      if (!acc[item.turma_id]) {
        acc[item.turma_id] = { turma_nome: item.turma_nome, disciplinas: [] };
      }
      acc[item.turma_id].disciplinas.push({
        id: item.disciplina_id,
        nome: item.disciplina_nome,
      });
      return acc;
    },
    {}
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Lançar Notas</h2>
          <p className="text-muted-foreground text-sm">
            {professorNome ? `Professor(a): ${professorNome} — ` : ""}
            Selecione a turma e disciplina
          </p>
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            Nenhuma turma encontrada no cronograma para o seu perfil de professor.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {Object.entries(grouped).map(([turmaId, turma]) => (
            <Card key={turmaId} className="gradient-card shadow-card border-0 overflow-hidden">
              <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg">{turma.turma_nome}</h3>
              </div>
              <div className="p-2">
                {turma.disciplinas.map((disc) => (
                  <button
                    key={disc.id}
                    onClick={() => onSelect(turmaId, disc.id, turma.turma_nome, disc.nome)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                  >
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="flex-1 font-medium text-foreground">{disc.nome}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
