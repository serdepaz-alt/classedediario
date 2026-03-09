import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNotes, AnotacaoForm } from "@/hooks/useNotes";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteFormDialog } from "@/components/notes/NoteFormDialog";
import { NoteStatsCards } from "@/components/notes/NoteStatsCards";
import {
  Plus,
  Search,
  StickyNote,
  Filter,
  Loader2,
} from "lucide-react";

export const Notes = () => {
  const { anotacoes, students, loading, createAnotacao, updateAnotacao, deleteAnotacao } = useNotes();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const filtered = anotacoes.filter(note => {
    const matchesSearch =
      (note.student_nome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.conteudo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || note.tipo === selectedType;
    const matchesStatus = selectedStatus === "all" || note.status_acompanhamento === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: anotacoes.length,
    positive: anotacoes.filter(n => ["positive", "achievement", "progress"].includes(n.tipo)).length,
    attention: anotacoes.filter(n => ["attention", "concern"].includes(n.tipo)).length,
    pendentes: anotacoes.filter(n => n.status_acompanhamento === "pendente").length,
  };

  const handleSave = async (form: AnotacaoForm) => {
    await createAnotacao(form);
    setShowAddDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Anotações dos Alunos</h1>
          <p className="text-muted-foreground">Registre observações para nortear o atendimento administrativo</p>
        </div>
        <Button variant="hero" size="lg" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-5 h-5" />
          Nova Anotação
        </Button>
      </div>

      <NoteStatsCards stats={stats} />

      {/* Filters */}
      <Card className="p-4 gradient-card shadow-card border-0">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por aluno, título ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="all">Todos os tipos</option>
            <option value="positive">Positiva</option>
            <option value="attention">Atenção</option>
            <option value="achievement">Conquista</option>
            <option value="progress">Progresso</option>
            <option value="concern">Preocupação</option>
            <option value="info">Informação</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="resolvido">Resolvido</option>
          </select>
        </div>
      </Card>

      {/* Notes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            onUpdate={updateAnotacao}
            onDelete={deleteAnotacao}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <Card className="p-12 text-center gradient-card shadow-card border-0">
          <StickyNote className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma anotação encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Tente ajustar sua busca" : "Comece adicionando sua primeira anotação"}
          </p>
          <Button variant="gradient" onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4" />
            Nova Anotação
          </Button>
        </Card>
      )}

      <NoteFormDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        students={students}
        onSave={handleSave}
      />
    </div>
  );
};
