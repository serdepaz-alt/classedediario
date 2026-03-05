import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type Turno = "Matutino" | "Vespertino" | "Noturno" | "Intermediário";

export interface PadraoDisciplina {
  id: string;
  user_id: string;
  turno: Turno;
  nome: string;
  carga_horaria_total: number;
  carga_horaria_diaria: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface PadraoDisciplinaFormData {
  turno: Turno;
  nome: string;
  carga_horaria_total: number;
  carga_horaria_diaria: number;
}

// Regra de negócio: sugerir carga diária baseada no turno
export const getCargaDiariaSugerida = (turno: Turno): number => {
  return (turno === "Matutino" || turno === "Vespertino") ? 3 : 2;
};

// Regra de negócio: disciplinas com "Estágio" têm carga fixa de 5h
export const getCargaDiariaEstagio = (nome: string): number | null => {
  return nome.toLowerCase().includes("estágio") ? 5 : null;
};

// Cálculo automático de dias
export const calcularQtdDias = (cargaTotal: number, cargaDiaria: number): number => {
  if (cargaDiaria <= 0) return 0;
  return Math.ceil(cargaTotal / cargaDiaria);
};

export const usePadroesDisciplinas = (turnoFiltro?: Turno) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: padroes = [], isLoading, error } = useQuery({
    queryKey: ["padroes-disciplinas", user?.id, turnoFiltro],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("padroes_disciplinas")
        .select("*")
        .eq("user_id", user.id)
        .order("nome");

      if (turnoFiltro) {
        query = query.eq("turno", turnoFiltro);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PadraoDisciplina[];
    },
    enabled: !!user?.id,
  });

  const createPadrao = useMutation({
    mutationFn: async (formData: PadraoDisciplinaFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("padroes_disciplinas")
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
      queryClient.invalidateQueries({ queryKey: ["padroes-disciplinas"] });
      toast.success("Padrão de disciplina criado!");
    },
    onError: (error) => {
      console.error("Erro ao criar padrão:", error);
      toast.error("Erro ao criar padrão de disciplina");
    },
  });

  const updatePadrao = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: Partial<PadraoDisciplinaFormData> }) => {
      const { data, error } = await supabase
        .from("padroes_disciplinas")
        .update(formData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["padroes-disciplinas"] });
      toast.success("Padrão atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar padrão:", error);
      toast.error("Erro ao atualizar padrão");
    },
  });

  const deletePadrao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("padroes_disciplinas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["padroes-disciplinas"] });
      toast.success("Padrão removido!");
    },
    onError: (error) => {
      console.error("Erro ao remover padrão:", error);
      toast.error("Erro ao remover padrão");
    },
  });

  return {
    padroes,
    isLoading,
    error,
    createPadrao,
    updatePadrao,
    deletePadrao,
  };
};
