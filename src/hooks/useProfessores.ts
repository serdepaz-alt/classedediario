import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Professor {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  valor_hora: number;
  especialidade: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProfessorFormData {
  nome: string;
  email?: string;
  telefone?: string;
  valor_hora: number;
  especialidade?: string;
  status?: string;
}

export const useProfessores = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: professores = [], isLoading, error } = useQuery({
    queryKey: ["professores", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("cad_professores")
        .select("*")
        .eq("user_id", user.id)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Professor[];
    },
    enabled: !!user?.id,
  });

  const createProfessor = useMutation({
    mutationFn: async (formData: ProfessorFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("cad_professores")
        .insert({
          user_id: user.id,
          nome: formData.nome,
          email: formData.email || null,
          telefone: formData.telefone || null,
          valor_hora: formData.valor_hora,
          especialidade: formData.especialidade || null,
          status: formData.status || "Ativo",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor cadastrado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao cadastrar professor:", error);
      toast.error("Erro ao cadastrar professor");
    },
  });

  const updateProfessor = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ProfessorFormData }) => {
      const { data, error } = await supabase
        .from("cad_professores")
        .update({
          nome: formData.nome,
          email: formData.email || null,
          telefone: formData.telefone || null,
          valor_hora: formData.valor_hora,
          especialidade: formData.especialidade || null,
          status: formData.status,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar professor:", error);
      toast.error("Erro ao atualizar professor");
    },
  });

  const deleteProfessor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cad_professores")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor removido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover professor:", error);
      toast.error("Erro ao remover professor");
    },
  });

  return {
    professores,
    isLoading,
    error,
    createProfessor,
    updateProfessor,
    deleteProfessor,
  };
};
