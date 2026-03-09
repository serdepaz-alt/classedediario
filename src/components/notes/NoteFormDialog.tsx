import { useState, useMemo, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { AnotacaoForm, ProfessorLogado } from "@/hooks/useNotes";

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
  allStudents: { id: string; nome: string; turma_id: string | null; turma_nome?: string }[];
  professorLogado: ProfessorLogado | null;
  professores: { id: string; nome: string; disciplinas_lecionar: string | null }[];
  onSave: (form: AnotacaoForm) => void;
}

export const NoteFormDialog = ({ open, onOpenChange, allStudents, professorLogado, professores, onSave }: Props) => {
  const [studentId, setStudentId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [tipo, setTipo] = useState("");
  const [prioridade, setPrioridade] = useState("normal");
  const [disciplina, setDisciplina] = useState("");
  const [professorNome, setProfessorNome] = useState("");

  // Auto-set professor logado and current discipline
  useEffect(() => {
    if (professorLogado && open) {
      if (!professorNome) setProfessorNome(professorLogado.nome);
      if (professorLogado.disciplina_atual && !disciplina) {
        setDisciplina(professorLogado.disciplina_atual);
      }
    }
  }, [professorLogado, open]);

  // Selected professor (logado or chosen)
  const selectedProfessor = useMemo(() => {
    if (professorLogado && professorNome === professorLogado.nome) return professorLogado;
    const p = professores.find(pr => pr.nome === professorNome);
    if (!p) return null;
    let discs: string[] = [];
    if (p.disciplinas_lecionar) {
      try {
        const parsed = JSON.parse(p.disciplinas_lecionar);
        discs = Array.isArray(parsed) ? parsed : [p.disciplinas_lecionar];
      } catch {
        discs = p.disciplinas_lecionar.split(",").map(d => d.trim()).filter(Boolean);
      }
    }
    return { id: p.id, nome: p.nome, disciplinas_lecionar: discs, turma_ids: [] as string[] };
  }, [professorNome, professorLogado, professores]);

  // Filter students: if professor has turmas, show only those turmas' students; otherwise show all
  const filteredStudents = useMemo(() => {
    if (professorLogado && professorNome === professorLogado.nome && professorLogado.turma_ids.length > 0) {
      return allStudents.filter(s => s.turma_id && professorLogado.turma_ids.includes(s.turma_id));
    }
    return allStudents;
  }, [allStudents, professorLogado, professorNome]);

  // Disciplinas: from selected professor's disciplinas_lecionar
  const disciplinasDisponiveis = useMemo(() => {
    return selectedProfessor?.disciplinas_lecionar || [];
  }, [selectedProfessor]);

  const selectedStudent = allStudents.find(s => s.id === studentId);
  const sugestoes = useMemo(() => sugestoesPorTipo[tipo] || [], [tipo]);

  const handleSugestaoClick = (texto: string) => {
    setConteudo(prev => prev ? `${prev}\n${texto}` : texto);
    if (!titulo) setTitulo(texto.substring(0, 60));
  };

  const handleSubmit = () => {
    if (!studentId || !titulo || !tipo) return;
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
    setTipo("");
    setPrioridade("normal");
    setDisciplina("");
    // Keep professor name for next entry
  };

  // Reset disciplina when professor changes
  useEffect(() => {
    setDisciplina("");
  }, [professorNome]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Anotação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Professor */}
          <div>
            <label className="text-sm font-medium mb-1 block">Professor que registrou</label>
            {professorLogado ? (
              <div className="flex items-center gap-2">
                <Input value={professorLogado.nome} disabled className="flex-1 bg-muted/30" />
                <Badge variant="outline" className="text-xs whitespace-nowrap">Logado</Badge>
              </div>
            ) : (
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
            )}
          </div>

          {/* Aluno - filtrado pelas turmas do professor */}
          <div>
            <label className="text-sm font-medium mb-1 block">Aluno *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="">Selecione um aluno...</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nome} {s.turma_nome ? `(${s.turma_nome})` : ""}
                </option>
              ))}
            </select>
            {professorLogado && professorLogado.turma_ids.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Mostrando alunos das suas turmas</p>
            )}
          </div>

          {/* Disciplina - atual do cronograma */}
          <div>
            <label className="text-sm font-medium mb-1 block">Disciplina</label>
            {professorLogado?.disciplina_atual ? (
              <div className="flex items-center gap-2">
                <Input value={professorLogado.disciplina_atual} disabled className="flex-1 bg-muted/30" />
                <Badge variant="outline" className="text-xs whitespace-nowrap">Atual</Badge>
              </div>
            ) : disciplinasDisponiveis.length > 0 ? (
              <select
                value={disciplina}
                onChange={(e) => setDisciplina(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value="">Selecione a disciplina...</option>
                {disciplinasDisponiveis.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            ) : (
              <Input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Digite a disciplina..." />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipo *</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">Selecione...</option>
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
            {tipo && sugestoes.length > 0 ? (
              <Collapsible>
                <CollapsibleTrigger className="text-xs text-primary/70 hover:text-primary underline cursor-pointer mb-2 inline-block">
                  Sugestões
                </CollapsibleTrigger>
                <CollapsibleContent>
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
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <span className="text-xs text-muted-foreground/50 mb-2 inline-block">Sugestões (selecione o tipo primeiro)</span>
            )}
            <Textarea value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Descreva sua observação ou clique numa sugestão acima..." className="min-h-[100px]" />
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant="gradient" disabled={!studentId || !titulo || !tipo} onClick={handleSubmit}>Salvar Anotação</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
