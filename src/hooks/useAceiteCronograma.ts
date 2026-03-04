import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PendingAceite {
  id: string;
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  status_aula: string | null;
  aceite_professor: boolean | null;
  turma?: { id: string; nome: string } | null;
  disciplina?: { id: string; nome: string } | null;
  professor?: { id: string; nome: string } | null;
}

export const useAceiteCronograma = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all aulas pending acceptance
  const { data: pendingAulas = [], isLoading } = useQuery({
    queryKey: ["aceite-cronograma", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          id, data_aula, hora_inicio, hora_fim, status_aula, aceite_professor,
          turma:turmas(id, nome),
          disciplina:cad_disciplinas(id, nome),
          professor:cad_professores(id, nome)
        `)
        .eq("user_id", user.id)
        .eq("aceite_professor", false)
        .neq("status_aula", "Cancelada")
        .order("data_aula", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) throw error;
      return data as PendingAceite[];
    },
    enabled: !!user?.id,
  });

  // Count pending for badge/lock
  const pendingCount = pendingAulas.length;
  const hasPending = pendingCount > 0;

  // Accept individual aula
  const acceptAula = useMutation({
    mutationFn: async (aulaId: string) => {
      const { error } = await supabase
        .from("cronograma_mestre")
        .update({ aceite_professor: true })
        .eq("id", aulaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aceite-cronograma"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      queryClient.invalidateQueries({ queryKey: ["pending-classes"] });
      toast.success("Aula aceita com sucesso!");
    },
    onError: () => toast.error("Erro ao aceitar aula"),
  });

  // Accept all pending aulas
  const acceptAll = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Não autenticado");
      const ids = pendingAulas.map((a) => a.id);
      if (ids.length === 0) return;

      const { error } = await supabase
        .from("cronograma_mestre")
        .update({ aceite_professor: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["aceite-cronograma"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      queryClient.invalidateQueries({ queryKey: ["pending-classes"] });
      toast.success("Todas as aulas foram aceitas!");
    },
    onError: () => toast.error("Erro ao aceitar aulas"),
  });

  return {
    pendingAulas,
    pendingCount,
    hasPending,
    isLoading,
    acceptAula,
    acceptAll,
  };
};
