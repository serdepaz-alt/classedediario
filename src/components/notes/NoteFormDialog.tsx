import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AnotacaoForm } from "@/hooks/useNotes";

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

  const selectedStudent = students.find(s => s.id === studentId);

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
      <DialogContent className="sm:max-w-lg">
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
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
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
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Descreva sua observação..." className="min-h-[100px]" />
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
