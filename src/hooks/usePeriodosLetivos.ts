import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface PeriodoLetivo {
  id: string;
  user_id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  ano_letivo: number;
  ativo: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface PeriodoLetivoFormData {
  nome: string;
  data_inicio: string;
  data_fim: string;
  ano_letivo: number;
  ativo?: boolean;
}

export const usePeriodosLetivos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: periodos = [], isLoading, error } = useQuery({
    queryKey: ["periodos-letivos", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("periodos_letivos")
        .select("*")
        .eq("user_id", user.id)
        .order("data_inicio", { ascending: false });

      if (error) throw error;
      return data as PeriodoLetivo[];
    },
    enabled: !!user?.id,
  });

  const createPeriodo = useMutation({
    mutationFn: async (formData: PeriodoLetivoFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("periodos_letivos")
        .insert({
          user_id: user.id,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos-letivos"] });
      toast.success("Período letivo criado!");
    },
    onError: (error) => {
      console.error("Erro ao criar período:", error);
      toast.error("Erro ao criar período letivo");
    },
  });

  const updatePeriodo = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Partial<PeriodoLetivoFormData> }) => {
      const { data, error } = await supabase
        .from("periodos_letivos")
        .update(formData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos-letivos"] });
      toast.success("Período atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar período:", error);
      toast.error("Erro ao atualizar período");
    },
  });

  const deletePeriodo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("periodos_letivos")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["periodos-letivos"] });
      toast.success("Período removido!");
    },
    onError: (error) => {
      console.error("Erro ao remover período:", error);
      toast.error("Erro ao remover período");
    },
  });

  return {
    periodos,
    isLoading,
    error,
    createPeriodo,
    updatePeriodo,
    deletePeriodo,
  };
};
