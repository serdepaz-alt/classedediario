import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TurmaCard } from "./turmas/TurmaCard";
import { AddTurmaDialog } from "./turmas/AddTurmaDialog";
import { TurmaDetailsDialog } from "./turmas/TurmaDetailsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  periodo: string | null;
  curso: string | null;
  disciplina: string | null;
  status: string | null;
}

const turnos = ["Manhã", "Tarde", "Noite", "Sábado"];

export const Turmas = () => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [filteredTurmas, setFilteredTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTurno, setSelectedTurno] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("Ativa");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [turmaToDelete, setTurmaToDelete] = useState<Turma | null>(null);

  useEffect(() => {
    if (user) {
      fetchTurmas();
    }
  }, [user]);

  useEffect(() => {
    filterTurmas();
  }, [turmas, searchQuery, selectedTurno, selectedStatus]);

  const fetchTurmas = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("turmas")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTurmas(data || []);
    } catch (error) {
      console.error("Error fetching turmas:", error);
      toast.error("Erro ao carregar turmas");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTurmas = () => {
    let filtered = [...turmas];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (turma) =>
          turma.nome.toLowerCase().includes(query) ||
          turma.curso?.toLowerCase().includes(query) ||
          turma.disciplina?.toLowerCase().includes(query)
      );
    }

    // Filter by turno
    if (selectedTurno !== "all") {
      filtered = filtered.filter((turma) => turma.periodo === selectedTurno);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((turma) => turma.status === selectedStatus);
    }

    setFilteredTurmas(filtered);
  };

  const handleEdit = (turma: Turma) => {
    setSelectedTurma(turma);
    setAddDialogOpen(true);
  };

  const handleViewDetails = (turma: Turma) => {
    setSelectedTurma(turma);
    setDetailsDialogOpen(true);
  };

  const handleDeleteClick = (turma: Turma) => {
    setTurmaToDelete(turma);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!turmaToDelete || !user) return;

    try {
      const { error } = await supabase
        .from("turmas")
        .delete()
        .eq("id", turmaToDelete.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Turma excluída com sucesso!");
      fetchTurmas();
    } catch (error: any) {
      console.error("Error deleting turma:", error);
      toast.error(error.message || "Erro ao excluir turma");
    } finally {
      setDeleteDialogOpen(false);
      setTurmaToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setAddDialogOpen(false);
    setSelectedTurma(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turmas</h1>
          <p className="text-muted-foreground">
            Gerencie suas classes ativas e futuras
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTurno} onValueChange={setSelectedTurno}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Turno" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">Todos</SelectItem>
              {turnos.map((turno) => (
                <SelectItem key={turno} value={turno}>
                  {turno}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Ativa">Ativa</SelectItem>
              <SelectItem value="Inativa">Inativa</SelectItem>
              <SelectItem value="Aguardando">Aguardando</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Turma
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por Turma, Disciplina ou Código da Turma"
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Turno Pills */}
      <div className="flex gap-2 flex-wrap">
        {turnos.map((turno) => (
          <Button
            key={turno}
            variant={selectedTurno === turno ? "default" : "outline"}
            size="sm"
            onClick={() =>
              setSelectedTurno(selectedTurno === turno ? "all" : turno)
            }
          >
            {turno}
          </Button>
        ))}
      </div>

      {/* Turmas Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredTurmas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTurmas.map((turma) => (
            <TurmaCard
              key={turma.id}
              turma={turma}
              stats={{ mediaGeral: 9.2, frequencia: 95 }}
              onViewDetails={() => handleViewDetails(turma)}
              onEdit={() => handleEdit(turma)}
              onDelete={() => handleDeleteClick(turma)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery || selectedTurno !== "all" || selectedStatus !== "all"
              ? "Nenhuma turma encontrada com os filtros aplicados."
              : "Nenhuma turma cadastrada. Clique em 'Adicionar Turma' para começar."}
          </p>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <AddTurmaDialog
        open={addDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchTurmas}
        turma={selectedTurma}
      />

      {/* Details Dialog */}
      <TurmaDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        turmaId={selectedTurma?.id || null}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a turma "{turmaToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
