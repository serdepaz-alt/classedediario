import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AulaProgramatica {
  id: string;
  user_id: string;
  disciplina_id: string | null;
  turma_id: string | null;
  disciplina_nome: string;
  data_aula: string;
  topico: string;
  objetivo: string | null;
  metodologia: string | null;
  recursos: string | null;
  tipo_avaliacao: string;
  observacoes: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
}

export const useConteudoProgramaticoAulas = (disciplinaId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: aulas = [], isLoading } = useQuery({
    queryKey: ["conteudo-programatico-aulas", user?.id, disciplinaId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from("conteudo_programatico_aulas")
        .select("*")
        .eq("user_id", user.id)
        .order("data_aula", { ascending: true });

      if (disciplinaId) {
        query = query.eq("disciplina_id", disciplinaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AulaProgramatica[];
    },
    enabled: !!user?.id,
  });

  const salvarAulasImportadas = useMutation({
    mutationFn: async ({
      aulasData,
      disciplinaId,
      turmaId,
      disciplinaNome,
    }: {
      aulasData: { data: string; topico: string; objetivo: string; metodologia: string; recursos: string; tipo_avaliacao: string; observacoes: string }[];
      disciplinaId?: string;
      turmaId?: string;
      disciplinaNome: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const rows = aulasData.map((a) => ({
        user_id: user.id,
        disciplina_id: disciplinaId || null,
        turma_id: turmaId || null,
        disciplina_nome: disciplinaNome,
        data_aula: a.data,
        topico: a.topico,
        objetivo: a.objetivo || null,
        metodologia: a.metodologia || null,
        recursos: a.recursos || null,
        tipo_avaliacao: a.tipo_avaliacao || "aula",
        observacoes: a.observacoes || null,
      }));

      const { error } = await supabase
        .from("conteudo_programatico_aulas")
        .insert(rows);

      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["conteudo-programatico-aulas"] });
      toast.success(`${count} aulas salvas no banco de dados!`);
    },
    onError: (error) => {
      console.error("Erro ao salvar aulas:", error);
      toast.error("Erro ao salvar aulas no banco");
    },
  });

  const deleteAula = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("conteudo_programatico_aulas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conteudo-programatico-aulas"] });
      toast.success("Aula removida!");
    },
    onError: () => toast.error("Erro ao remover aula"),
  });

  const updateAulaStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("conteudo_programatico_aulas")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conteudo-programatico-aulas"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const updateAula = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<AulaProgramatica, "topico" | "objetivo" | "metodologia" | "recursos" | "tipo_avaliacao" | "observacoes" | "status" | "data_aula" | "disciplina_nome">>;
    }) => {
      const { error } = await supabase
        .from("conteudo_programatico_aulas")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conteudo-programatico-aulas"] });
      toast.success("Aula atualizada!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar aula: " + err.message),
  });

  return { aulas, isLoading, salvarAulasImportadas, deleteAula, updateAulaStatus, updateAula };
};
