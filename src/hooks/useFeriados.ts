import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Feriado {
  id: string;
  user_id: string;
  data: string;
  nome: string;
  tipo: string | null;
  created_at: string;
}

export interface FeriadoFormData {
  data: string;
  nome: string;
  tipo?: string;
}

export const useFeriados = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: feriados = [], isLoading } = useQuery({
    queryKey: ["feriados", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("feriados")
        .select("*")
        .eq("user_id", user.id)
        .order("data", { ascending: true });
      if (error) throw error;
      return data as Feriado[];
    },
    enabled: !!user?.id,
  });

  const createFeriado = useMutation({
    mutationFn: async (formData: FeriadoFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("feriados")
        .insert({
          user_id: user.id,
          data: formData.data,
          nome: formData.nome,
          tipo: formData.tipo || "feriado",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feriados"] });
      toast.success("Feriado cadastrado com sucesso!");
    },
    onError: () => toast.error("Erro ao cadastrar feriado"),
  });

  const deleteFeriado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feriados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feriados"] });
      toast.success("Feriado removido!");
    },
    onError: () => toast.error("Erro ao remover feriado"),
  });

  return { feriados, isLoading, createFeriado, deleteFeriado };
};
