import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { AnotacaoForm } from "@/hooks/useNotes";

const sugestoesPorTipo: Record<string, string[]> = {
  positive: [
    "Demonstrou excelente participação e engajamento na aula",
    "Ajudou colegas com dificuldade, mostrando espírito colaborativo",
    "Entregou todas as atividades no prazo com qualidade acima da média",
  ],
  attention: [
    "Apresenta dificuldade de concentração durante as aulas",
    "Tem se mostrado disperso(a) e pouco participativo(a)",
    "Necessita de acompanhamento individualizado para acompanhar o conteúdo",
  ],
  achievement: [
    "Obteve a maior nota da turma na avaliação",
    "Apresentou trabalho de destaque reconhecido pela turma",
    "Superou meta de desempenho estabelecida no início do período",
  ],
  progress: [
    "Demonstrou melhora significativa em relação ao período anterior",
    "Evoluiu na interpretação e resolução de exercícios práticos",
    "Passou a participar ativamente após intervenção pedagógica",
  ],
  concern: [
    "Acumula faltas consecutivas sem justificativa apresentada",
    "Apresenta sinais de desmotivação e risco de evasão",
    "Rendimento caiu drasticamente — recomenda-se conversa com a família",
  ],
  info: [
    "Solicitou transferência de turma por questões de horário",
    "Apresentou atestado médico para justificar ausências recentes",
    "Responsável entrou em contato solicitando informações sobre desempenho",
  ],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: { id: string; nome: string; turma_id: string | null; turma_nome?: string }[];
  disciplinasPadrao: string[];
  professores: { id: string; nome: string }[];
  onSave: (form: AnotacaoForm) => void;
}

export const NoteFormDialog = ({ open, onOpenChange, students, disciplinasPadrao, professores, onSave }: Props) => {
  const [studentId, setStudentId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState("info");
  const [prioridade, setPrioridade] = useState("normal");
  const [disciplina, setDisciplina] = useState("");
  const [professorNome, setProfessorNome] = useState("");
  const [usandoSugestao, setUsandoSugestao] = useState(false);

  const selectedStudent = students.find(s => s.id === studentId);
  const sugestoes = useMemo(() => sugestoesPorTipo[tipo] || [], [tipo]);

  const handleSugestaoClick = (texto: string) => {
    setConteudo(prev => prev ? `${prev}\n${texto}` : texto);
    if (!titulo) setTitulo(texto.substring(0, 60));
    setUsandoSugestao(false);
  };

  const handleSubmit = () => {
    if (!studentId || !titulo) return;
    onSave({
      student_id: studentId,
      turma_id: selectedStudent?.turma_id || null,
      titulo,
      conteudo,
      tipo,
      prioridade,
      disciplina: disciplina || undefined,
      professor_nome: professorNome || undefined,
    });
    setStudentId("");
    setTitulo("");
    setConteudo("");
    setTipo("info");
    setPrioridade("normal");
    setDisciplina("");
    setProfessorNome("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Anotação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Aluno *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Selecione um aluno...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome} {s.turma_nome ? `(${s.turma_nome})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Professor que registrou</label>
            <select
              value={professorNome}
              onChange={(e) => setProfessorNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Selecione o professor...</option>
              {professores.map(p => (
                <option key={p.id} value={p.nome}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Disciplina</label>
            <select
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Selecione a disciplina...</option>
              {disciplinasPadrao.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo</label>
              <select value={tipo} onChange={(e) => { setTipo(e.target.value); setUsandoSugestao(false); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="positive">Positiva</option>
                <option value="attention">Atenção</option>
                <option value="achievement">Conquista</option>
                <option value="progress">Progresso</option>
                <option value="concern">Preocupação</option>
                <option value="info">Informação</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Prioridade</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="normal">Normal</option>
                <option value="high">Alta</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Título *</label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título da anotação..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Conteúdo</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {sugestoes.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSugestaoClick(s)}
                  className="text-xs px-2.5 py-1.5 rounded-full bg-primary/8 text-primary/80 border border-primary/15 hover:bg-primary/15 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  {s.length > 55 ? s.substring(0, 55) + "…" : s}
                </button>
              ))}
            </div>
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Descreva sua observação ou clique numa sugestão acima..." className="min-h-[100px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={!studentId || !titulo} onClick={handleSubmit}>Salvar Anotação</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
