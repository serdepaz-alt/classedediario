import { useState } from "react";
import { useProfessores, Professor, ProfessorFormData } from "@/hooks/useProfessores";
import { ProfessorCard } from "./ProfessorCard";
import { ProfessorFormDialog } from "./ProfessorFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Users, Loader2 } from "lucide-react";

export const ProfessoresList = () => {
  const { professores, isLoading, createProfessor, updateProfessor, deleteProfessor } = useProfessores();
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [professorToDelete, setProfessorToDelete] = useState<Professor | null>(null);

  const filteredProfessores = professores.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.especialidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setSelectedProfessor(null);
    setFormOpen(true);
  };

  const handleEdit = (professor: Professor) => {
    setSelectedProfessor(professor);
    setFormOpen(true);
  };

  const handleDelete = (professor: Professor) => {
    setProfessorToDelete(professor);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (professorToDelete) {
      await deleteProfessor.mutateAsync(professorToDelete.id);
      setDeleteDialogOpen(false);
      setProfessorToDelete(null);
    }
  };

  const handleSubmit = async (data: ProfessorFormData) => {
    if (selectedProfessor) {
      await updateProfessor.mutateAsync({ id: selectedProfessor.id, formData: data });
    } else {
      await createProfessor.mutateAsync(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, especialidade ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Professor
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {filteredProfessores.length} professor{filteredProfessores.length !== 1 ? "es" : ""} encontrado{filteredProfessores.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid */}
      {filteredProfessores.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum professor encontrado</p>
          <p className="text-sm">
            {searchTerm
              ? "Tente ajustar sua busca"
              : "Cadastre seu primeiro professor clicando no botão acima"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessores.map((professor) => (
            <ProfessorCard
              key={professor.id}
              professor={professor}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <ProfessorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        professor={selectedProfessor}
        onSubmit={handleSubmit}
        isSubmitting={createProfessor.isPending || updateProfessor.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o professor{" "}
              <strong>{professorToDelete?.nome}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfessor.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
