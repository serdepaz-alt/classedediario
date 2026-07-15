import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileUp, LayoutGrid, List, ArrowUpDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { TurmaCard } from "./turmas/TurmaCard";
import { TurmaTableView } from "./turmas/TurmaTableView";
import { AddTurmaDialog } from "./turmas/AddTurmaDialog";
import { TurmaDetailsDialog } from "./turmas/TurmaDetailsDialog";
import { ImportPdfDialog } from "./turmas/ImportPdfDialog";
import { useTurmaStats } from "@/hooks/useTurmaStats";
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
  horario: string | null;
  data_inicio: string | null;
  status: string | null;
}

const turnos = ["Manhã", "Tarde", "Noite", "Sábado"];

type SortKey = "nome" | "data_inicio" | "ano_letivo" | "alunos";

export const Turmas = () => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTurno, setSelectedTurno] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importPdfDialogOpen, setImportPdfDialogOpen] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [turmaToDelete, setTurmaToDelete] = useState<Turma | null>(null);
  const [deleteDeps, setDeleteDeps] = useState<{ alunos: number; disciplinas: number }>({ alunos: 0, disciplinas: 0 });
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [sortKey, setSortKey] = useState<SortKey>("nome");

  const turmaIds = useMemo(() => turmas.map((t) => t.id), [turmas]);
  const { data: statsMap = {} } = useTurmaStats(turmaIds);

  const handlePrintRoster = async (turma: Turma) => {
    try {
      const { data: alunos, error } = await supabase
        .from("students")
        .select("nome")
        .eq("turma_id", turma.id)
        .eq("status", "Ativo")
        .order("nome", { ascending: true });
      if (error) throw error;

      const rows = (alunos || [])
        .map(
          (a, i) => `
            <tr>
              <td style="text-align:center">${i + 1}</td>
              <td style="font-size:13px">${a.nome ?? "—"}</td>
              <td></td>
            </tr>`
        )
        .join("");

      const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Lista Nominal - ${turma.nome}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; }
  .header { text-align: center; margin-bottom: 18px; }
  .header h1 { font-size: 20px; margin: 0 0 4px; }
  .header h2 { font-size: 14px; margin: 0; color: #555; font-weight: normal; }
  .header .turma { font-size: 13px; color: #333; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #bbb; padding: 8px 10px; vertical-align: middle; }
  th { background: #f1f5f9; font-size: 12px; text-transform: uppercase; text-align: left; }
  td:nth-child(1) { width: 40px; text-align: center; }
  td:nth-child(2) { width: 55%; }
  td:nth-child(3) { width: 40%; }
  tr { height: 36px; }
  .footer { margin-top: 20px; font-size: 11px; color: #555; display: flex; justify-content: space-between; }
  @media print { .no-print { display: none; } }
  .no-print { text-align: right; margin-bottom: 10px; }
  .no-print button { padding: 8px 14px; cursor: pointer; }
</style></head>
<body>
  <div class="no-print"><button onclick="window.print()">Imprimir</button></div>
  <div class="header">
    <h1>Lista de Presença</h1>
    <h2>Lista Nominal de Alunos</h2>
    <div class="turma"><b>Turma:</b> ${turma.nome} &nbsp;|&nbsp; <b>Curso:</b> ${turma.curso ?? "—"} &nbsp;|&nbsp; <b>Turno:</b> ${turma.periodo ?? "—"}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">Nº</th>
        <th>Nome do Aluno</th>
        <th>Assinatura</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="3" style="text-align:center;padding:20px">Nenhum aluno ativo nesta turma.</td></tr>`}
    </tbody>
  </table>
  <div class="footer">
    <span>Total de alunos: ${alunos?.length ?? 0}</span>
    <span>${new Date().toLocaleDateString("pt-BR")}</span>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

      const w = window.open("", "_blank");
      if (!w) {
        toast.error("Permita pop-ups para imprimir a lista nominal.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar lista nominal: " + (e?.message || ""));
    }
  };

  const handlePrintPhoneList = async (turma: Turma) => {
    try {
      const { data: alunos, error } = await supabase
        .from("students")
        .select("nome, telefone, email")
        .eq("turma_id", turma.id)
        .eq("status", "Ativo")
        .order("nome", { ascending: true });
      if (error) throw error;

      const rows = (alunos || [])
        .map((a, i) => {
          const tel = (a.telefone ?? "").toString().trim();
          const digits = tel.replace(/\D/g, "");
          const waLink = digits
            ? `<a href="https://wa.me/55${digits}" target="_blank" style="color:#059669;text-decoration:none">${tel}</a>`
            : "—";
          return `
            <tr>
              <td style="text-align:center">${i + 1}</td>
              <td style="font-size:13px">${a.nome ?? "—"}</td>
              <td style="font-size:13px;font-family:monospace">${waLink}</td>
              <td style="font-size:12px;color:#555">${a.email ?? "—"}</td>
            </tr>`;
        })
        .join("");

      const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Lista Telefônica - ${turma.nome}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; }
  .header { text-align: center; margin-bottom: 18px; }
  .header h1 { font-size: 20px; margin: 0 0 4px; }
  .header h2 { font-size: 14px; margin: 0; color: #555; font-weight: normal; }
  .header .turma { font-size: 13px; color: #333; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #bbb; padding: 8px 10px; vertical-align: middle; }
  th { background: #f1f5f9; font-size: 12px; text-transform: uppercase; text-align: left; }
  td:nth-child(1) { width: 40px; text-align: center; }
  td:nth-child(2) { width: 38%; }
  td:nth-child(3) { width: 22%; }
  tr { height: 32px; }
  .footer { margin-top: 20px; font-size: 11px; color: #555; display: flex; justify-content: space-between; }
  @media print { .no-print { display: none; } }
  .no-print { text-align: right; margin-bottom: 10px; }
  .no-print button { padding: 8px 14px; cursor: pointer; }
</style></head>
<body>
  <div class="no-print"><button onclick="window.print()">Imprimir</button></div>
  <div class="header">
    <h1>Lista Telefônica</h1>
    <h2>Contatos dos Alunos</h2>
    <div class="turma"><b>Turma:</b> ${turma.nome} &nbsp;|&nbsp; <b>Curso:</b> ${turma.curso ?? "—"} &nbsp;|&nbsp; <b>Turno:</b> ${turma.periodo ?? "—"}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:40px">Nº</th>
        <th>Nome do Aluno</th>
        <th>Telefone</th>
        <th>E-mail</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="4" style="text-align:center;padding:20px">Nenhum aluno ativo nesta turma.</td></tr>`}
    </tbody>
  </table>
  <div class="footer">
    <span>Total de alunos: ${alunos?.length ?? 0}</span>
    <span>${new Date().toLocaleDateString("pt-BR")}</span>
  </div>
  <script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

      const w = window.open("", "_blank");
      if (!w) {
        toast.error("Permita pop-ups para imprimir a lista telefônica.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar lista telefônica: " + (e?.message || ""));
    }
  };

  useEffect(() => {
    if (user) fetchTurmas();
  }, [user]);

  // Auto-update status to "Concluída" only when all disciplines are done
  useEffect(() => {
    if (Object.keys(statsMap).length === 0) return;
    turmas.forEach(async (turma) => {
      const s = statsMap[turma.id];
      const shouldBeConcluida =
        s &&
        s.totalDisciplinas > 0 &&
        s.disciplinasConcluidas === s.totalDisciplinas &&
        turma.status === "Ativa";
      const shouldBeAtiva =
        s &&
        s.totalDisciplinas > 0 &&
        s.disciplinasConcluidas < s.totalDisciplinas &&
        turma.status === "Concluída";

      if (shouldBeConcluida) {
        await supabase.from("turmas").update({ status: "Concluída" }).eq("id", turma.id);
        setTurmas((prev) =>
          prev.map((t) => (t.id === turma.id ? { ...t, status: "Concluída" } : t))
        );
      } else if (shouldBeAtiva) {
        await supabase.from("turmas").update({ status: "Ativa" }).eq("id", turma.id);
        setTurmas((prev) =>
          prev.map((t) => (t.id === turma.id ? { ...t, status: "Ativa" } : t))
        );
      }
    });
  }, [statsMap]);

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

  const filteredTurmas = useMemo(() => {
    let filtered = [...turmas];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.nome.toLowerCase().includes(query) ||
          t.curso?.toLowerCase().includes(query) ||
          t.disciplina?.toLowerCase().includes(query)
      );
    }
    if (selectedTurno !== "all") {
      filtered = filtered.filter((t) => t.periodo === selectedTurno);
    }
    if (selectedStatus !== "all") {
      filtered = filtered.filter((t) => t.status === selectedStatus);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortKey) {
        case "nome":
          return a.nome.localeCompare(b.nome);
        case "data_inicio":
          return (a.data_inicio || "").localeCompare(b.data_inicio || "");
        case "ano_letivo":
          return b.ano_letivo - a.ano_letivo;
        case "alunos":
          return (statsMap[b.id]?.totalAlunos ?? 0) - (statsMap[a.id]?.totalAlunos ?? 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [turmas, searchQuery, selectedTurno, selectedStatus, sortKey, statsMap]);

  const handleEdit = (turma: Turma) => {
    setSelectedTurma(turma);
    setAddDialogOpen(true);
  };

  const handleViewDetails = (turma: Turma) => {
    setSelectedTurma(turma);
    setDetailsDialogOpen(true);
  };

  const handleDeleteClick = async (turma: Turma) => {
    setTurmaToDelete(turma);
    // Fetch dependencies
    const [{ count: alunosCount }, { count: discCount }] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("turma_id", turma.id),
      supabase.from("disciplinas").select("id", { count: "exact", head: true }).eq("turma_id", turma.id),
    ]);
    setDeleteDeps({ alunos: alunosCount ?? 0, disciplinas: discCount ?? 0 });
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
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedTurno} onValueChange={setSelectedTurno}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Turno" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="all">Todos</SelectItem>
              {turnos.map((turno) => (
                <SelectItem key={turno} value={turno}>{turno}</SelectItem>
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
              <SelectItem value="Concluída">Concluída</SelectItem>
              <SelectItem value="Inativa">Inativa</SelectItem>
              <SelectItem value="Aguardando">Aguardando</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setImportPdfDialogOpen(true)}>
            <FileUp className="w-4 h-4 mr-2" />
            Importar PDF
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Turma
          </Button>
        </div>
      </div>

      {/* Search + Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por Turma, Disciplina ou Código"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Sort */}
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="w-3.5 h-3.5 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="data_inicio">Data Início</SelectItem>
            <SelectItem value="ano_letivo">Ano Letivo</SelectItem>
            <SelectItem value="alunos">Nº Alunos</SelectItem>
          </SelectContent>
        </Select>

        {/* View Mode */}
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
      </div>

      {/* Turno Pills */}
      <div className="flex gap-2 flex-wrap">
        {turnos.map((turno) => (
          <Button
            key={turno}
            variant={selectedTurno === turno ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTurno(selectedTurno === turno ? "all" : turno)}
          >
            {turno}
          </Button>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span><strong>TE</strong> – Técnico em Enfermagem</span>
        <span><strong>UTI</strong> – UTI</span>
        <span><strong>HE</strong> – Hemodiálise</span>
        <span><strong>EM</strong> – Emergência</span>
        <span><strong>CI</strong> – Cuidador de Idosos</span>
        <span><strong>AT</strong> – Atualização</span>
        <span><strong>HC</strong> – Home Care</span>
        <span><strong>CC</strong> – CME e CC</span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : filteredTurmas.length > 0 ? (
        viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTurmas.map((turma) => (
              <TurmaCard
                key={turma.id}
                turma={turma}
                stats={statsMap[turma.id]}
                onViewDetails={() => handleViewDetails(turma)}
                onEdit={() => handleEdit(turma)}
                onDelete={() => handleDeleteClick(turma)}
                onPrintRoster={() => handlePrintRoster(turma)}
                onPrintPhoneList={() => handlePrintPhoneList(turma)}
              />
            ))}
          </div>
        ) : (
          <TurmaTableView
            turmas={filteredTurmas}
            statsMap={statsMap}
            onViewDetails={handleViewDetails}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onPrintRoster={handlePrintRoster}
          />
        )
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery || selectedTurno !== "all" || selectedStatus !== "all"
              ? "Nenhuma turma encontrada com os filtros aplicados."
              : "Nenhuma turma cadastrada. Clique em 'Adicionar Turma' para começar."}
          </p>
        </div>
      )}

      {/* Dialogs */}
      <AddTurmaDialog
        open={addDialogOpen}
        onOpenChange={handleDialogClose}
        onSuccess={fetchTurmas}
        turma={selectedTurma}
      />

      <TurmaDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        turmaId={selectedTurma?.id || null}
      />

      {/* Delete Confirmation with Dependencies */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a turma "{turmaToDelete?.nome}"?
              {(deleteDeps.alunos > 0 || deleteDeps.disciplinas > 0) && (
                <span className="block mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm font-medium">
                  ⚠️ Esta turma possui:
                  {deleteDeps.alunos > 0 && (
                    <span className="block">• {deleteDeps.alunos} aluno(s) vinculado(s)</span>
                  )}
                  {deleteDeps.disciplinas > 0 && (
                    <span className="block">• {deleteDeps.disciplinas} disciplina(s) cadastrada(s)</span>
                  )}
                  <span className="block mt-1 text-xs">
                    Esses registros serão desvinculados ou removidos.
                  </span>
                </span>
              )}
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

      <ImportPdfDialog
        open={importPdfDialogOpen}
        onOpenChange={setImportPdfDialogOpen}
        onSuccess={fetchTurmas}
      />
    </div>
  );
};
