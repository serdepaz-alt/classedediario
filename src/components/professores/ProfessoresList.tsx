import { useState, useMemo } from "react";
import { useProfessores, Professor, ProfessorFormData } from "@/hooks/useProfessores";
import { useProfessorStats } from "@/hooks/useProfessorStats";
import { ProfessorCard } from "./ProfessorCard";
import { ProfessorTableView } from "./ProfessorTableView";
import { ProfessorProfileDialog } from "./ProfessorProfileDialog";
import { ProfessorFormDialog } from "./ProfessorFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Search, Users, Loader2, LayoutGrid, List, FileDown, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const ProfessoresList = () => {
  const { professores, isLoading, createProfessor, updateProfessor, deleteProfessor } = useProfessores();
  const [searchTerm, setSearchTerm] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState<Professor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [professorToDelete, setProfessorToDelete] = useState<Professor | null>(null);
  const [deleteDeps, setDeleteDeps] = useState(0);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFuncao, setFilterFuncao] = useState<string>("all");
  const [provisioning, setProvisioning] = useState(false);

  const professorIds = useMemo(() => professores.map((p) => p.id), [professores]);
  const { data: statsMap = {} } = useProfessorStats(professorIds);

  const funcoes = useMemo(() => {
    const set = new Set(professores.map((p) => p.funcao).filter(Boolean));
    return Array.from(set) as string[];
  }, [professores]);

  const filteredProfessores = useMemo(() => {
    let filtered = [...professores];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.nome.toLowerCase().includes(q) ||
          p.especialidade?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.disciplinas_lecionar?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((p) => (p.status || "Ativo") === filterStatus);
    }

    if (filterFuncao !== "all") {
      filtered = filtered.filter((p) => p.funcao === filterFuncao);
    }

    return filtered;
  }, [professores, searchTerm, filterStatus, filterFuncao]);

  const handleCreate = () => {
    setSelectedProfessor(null);
    setFormOpen(true);
  };

  const handleEdit = (professor: Professor) => {
    setSelectedProfessor(professor);
    setFormOpen(true);
  };

  const handleViewProfile = (professor: Professor) => {
    setSelectedProfessor(professor);
    setProfileOpen(true);
  };

  const handleDelete = async (professor: Professor) => {
    setProfessorToDelete(professor);
    const { count } = await supabase
      .from("cronograma_mestre")
      .select("id", { count: "exact", head: true })
      .eq("professor_id", professor.id);
    setDeleteDeps(count ?? 0);
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

  const handleExportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Professores</title>
      <style>body{font-family:Arial;padding:20px;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f0f0f0}</style></head><body>
      <h1>Lista de Professores</h1><p>Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
      <table><tr><th>#</th><th>Nome</th><th>Função</th><th>Email</th><th>Telefone</th><th>Especialidade</th><th>Coren</th><th>Status</th><th>Aulas</th><th>Horas</th></tr>`);
    filteredProfessores.forEach((p, i) => {
      const s = statsMap[p.id];
      w.document.write(`<tr><td>${i + 1}</td><td>${p.nome}</td><td>${p.funcao || "—"}</td><td>${p.email || "—"}</td>
        <td>${p.telefone || "—"}</td><td>${p.especialidade || "—"}</td><td>${p.coren || "—"}</td>
        <td>${p.status || "Ativo"}</td><td>${s?.totalAulas ?? 0}</td><td>${Math.round(s?.totalHoras ?? 0)}h</td></tr>`);
    });
    w.document.write("</table></body></html>");
    w.document.close();
    w.print();
  };

  const handleAtribuirLogins = async () => {
    const elegiveis = professores.filter(
      (p) => p.email && (p.status || "Ativo") === "Ativo"
    );
    if (elegiveis.length === 0) {
      toast.error("Nenhum professor ativo com email cadastrado");
      return;
    }
    setProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-professor-account",
        { body: { professorIds: elegiveis.map((p) => p.id) } }
      );
      if (error) throw error;
      const results = (data?.results ?? []) as Array<{ status: string; nome: string; message?: string }>;
      const created = results.filter((r) => r.status === "created").length;
      const exists = results.filter((r) => r.status === "exists").length;
      const skipped = results.filter((r) => r.status === "skipped").length;
      const errors = results.filter((r) => r.status === "error");
      toast.success(
        `Logins atribuídos: ${created} criados, ${exists} já existentes${
          skipped ? `, ${skipped} ignorados` : ""
        }${errors.length ? `, ${errors.length} com erro` : ""}`
      );
      errors.forEach((e) => toast.error(`${e.nome}: ${e.message}`));
    } catch (e: any) {
      toast.error(`Falha ao atribuir logins: ${e.message ?? e}`);
    } finally {
      setProvisioning(false);
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
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, especialidade, email ou disciplina..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="Ativo">Ativo</SelectItem>
              <SelectItem value="Inativo">Inativo</SelectItem>
              <SelectItem value="Afastado">Afastado</SelectItem>
            </SelectContent>
          </Select>

          {funcoes.length > 0 && (
            <Select value={filterFuncao} onValueChange={setFilterFuncao}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="all">Todas</SelectItem>
                {funcoes.map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode("card")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode("table")}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={handleExportPDF} className="gap-2">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleAtribuirLogins}
            disabled={provisioning}
            className="gap-2"
          >
            {provisioning ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            Atribuir Logins
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" /> Novo Professor
          </Button>
        </div>
      </div>

      {/* Counter */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>{filteredProfessores.length} professor{filteredProfessores.length !== 1 ? "es" : ""} encontrado{filteredProfessores.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Content */}
      {filteredProfessores.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Nenhum professor encontrado</p>
          <p className="text-sm">
            {searchTerm || filterStatus !== "all" || filterFuncao !== "all"
              ? "Tente ajustar seus filtros"
              : "Cadastre seu primeiro professor clicando no botão acima"}
          </p>
        </div>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessores.map((professor) => (
            <ProfessorCard
              key={professor.id}
              professor={professor}
              stats={statsMap[professor.id]}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewProfile={handleViewProfile}
            />
          ))}
        </div>
      ) : (
        <ProfessorTableView
          professores={filteredProfessores}
          statsMap={statsMap}
          onViewProfile={handleViewProfile}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Form Dialog */}
      <ProfessorFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        professor={selectedProfessor}
        onSubmit={handleSubmit}
        isSubmitting={createProfessor.isPending || updateProfessor.isPending}
      />

      {/* Profile Dialog */}
      <ProfessorProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        professor={selectedProfessor}
      />

      {/* Delete Confirmation with Dependencies */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o professor <strong>{professorToDelete?.nome}</strong>?
              {deleteDeps > 0 && (
                <span className="block mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm font-medium">
                  ⚠️ Este professor possui {deleteDeps} aula(s) agendada(s) no cronograma que serão desvinculadas.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProfessor.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
