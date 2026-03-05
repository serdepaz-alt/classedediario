import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AulaExcecao {
  id: string;
  user_id: string;
  turma_id: string | null;
  disciplina_id: string | null;
  professor_id: string | null;
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  status_aula: string | null;
  status_financeiro: string | null;
  valor_calculado: number | null;
  observacoes: string | null;
  turma?: { id: string; nome: string } | null;
  professor?: { id: string; nome: string; valor_hora: number } | null;
  disciplina?: { id: string; nome: string } | null;
}

export const useGestaoExcecoes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch classes that need exception handling (cancelled or pending replacement)
  const { data: excecoes = [], isLoading } = useQuery({
    queryKey: ["gestao-excecoes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          *,
          turma:turmas(id, nome),
          professor:cad_professores(id, nome, valor_hora),
          disciplina:cad_disciplinas(id, nome)
        `)
        .eq("user_id", user.id)
        .in("status_aula", ["Cancelada", "Pendente de Reposição"])
        .order("data_aula", { ascending: false });

      if (error) throw error;
      return data as AulaExcecao[];
    },
    enabled: !!user?.id,
  });

  // Fetch all scheduled classes (for marking as absent)
  const { data: aulasAgendadas = [] } = useQuery({
    queryKey: ["aulas-agendadas-excecoes", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          *,
          turma:turmas(id, nome),
          professor:cad_professores(id, nome, valor_hora),
          disciplina:cad_disciplinas(id, nome)
        `)
        .eq("user_id", user.id)
        .in("status_aula", ["Agendada", "Confirmada"])
        .order("data_aula", { ascending: true });

      if (error) throw error;
      return data as AulaExcecao[];
    },
    enabled: !!user?.id,
  });

  // Fetch available professors for substitution
  const { data: professores = [] } = useQuery({
    queryKey: ["professores-substituicao", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cad_professores")
        .select("id, nome, valor_hora")
        .eq("user_id", user.id)
        .eq("status", "Ativo")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Mark class as teacher absent (Pendente de Reposição + Bloqueado)
  const marcarFalta = useMutation({
    mutationFn: async (aulaId: string) => {
      const { error } = await supabase
        .from("cronograma_mestre")
        .update({
          status_aula: "Pendente de Reposição",
          status_financeiro: "Bloqueado",
        })
        .eq("id", aulaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestao-excecoes"] });
      queryClient.invalidateQueries({ queryKey: ["aulas-agendadas-excecoes"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      toast.success("Falta registrada. Financeiro bloqueado automaticamente.");
    },
    onError: () => toast.error("Erro ao registrar falta"),
  });

  // Substitute professor (recalculates cost via DB trigger)
  const substituirProfessor = useMutation({
    mutationFn: async ({ aulaId, novoProfessorId }: { aulaId: string; novoProfessorId: string }) => {
      const { error } = await supabase
        .from("cronograma_mestre")
        .update({
          professor_id: novoProfessorId,
          status_aula: "Confirmada",
          status_financeiro: "Pendente",
        })
        .eq("id", aulaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestao-excecoes"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      queryClient.invalidateQueries({ queryKey: ["smart-finance"] });
      toast.success("Professor substituído. Custo recalculado automaticamente.");
    },
    onError: () => toast.error("Erro ao substituir professor"),
  });

  // Cancel class permanently
  const cancelarAula = useMutation({
    mutationFn: async (aulaId: string) => {
      const { error } = await supabase
        .from("cronograma_mestre")
        .update({
          status_aula: "Cancelada",
          status_financeiro: "Bloqueado",
        })
        .eq("id", aulaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gestao-excecoes"] });
      queryClient.invalidateQueries({ queryKey: ["aulas-agendadas-excecoes"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      toast.success("Aula cancelada. Estorno financeiro aplicado.");
    },
    onError: () => toast.error("Erro ao cancelar aula"),
  });

  const pendentes = excecoes.filter((e) => e.status_aula === "Pendente de Reposição");
  const canceladas = excecoes.filter((e) => e.status_aula === "Cancelada");

  return {
    excecoes,
    pendentes,
    canceladas,
    aulasAgendadas,
    professores,
    isLoading,
    marcarFalta,
    substituirProfessor,
    cancelarAula,
  };
};
