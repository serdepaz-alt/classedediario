import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface Aula {
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
  aceite_professor: boolean | null;
  observacoes: string | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined data
  turma?: { id: string; nome: string; curso: string | null } | null;
  professor?: { id: string; nome: string; valor_hora: number } | null;
  disciplina?: { id: string; nome: string } | null;
}

export interface AulaFormData {
  turma_id: string;
  disciplina_id?: string;
  professor_id?: string;
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  status_aula?: string;
  observacoes?: string;
}

export const useCronograma = (weekStart?: Date) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const currentWeekStart = weekStart || startOfWeek(new Date(), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

  const { data: aulas = [], isLoading, error } = useQuery({
    queryKey: ["cronograma", user?.id, format(currentWeekStart, "yyyy-MM-dd")],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          *,
          turma:turmas(id, nome, curso),
          professor:cad_professores(id, nome, valor_hora),
          disciplina:cad_disciplinas(id, nome)
        `)
        .eq("user_id", user.id)
        .gte("data_aula", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("data_aula", format(currentWeekEnd, "yyyy-MM-dd"))
        .order("data_aula", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) throw error;
      return data as Aula[];
    },
    enabled: !!user?.id,
  });

  // Fetch turmas for dropdown
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas-dropdown", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso")
        .eq("user_id", user.id)
        .eq("status", "Ativa")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch professores for dropdown
  const { data: professores = [] } = useQuery({
    queryKey: ["professores-dropdown", user?.id],
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

  // Fetch disciplinas for dropdown
  const { data: disciplinas = [] } = useQuery({
    queryKey: ["disciplinas-dropdown", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("cad_disciplinas")
        .select("id, nome, curso")
        .eq("user_id", user.id)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createAula = useMutation({
    mutationFn: async (formData: AulaFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("cronograma_mestre")
        .insert({
          user_id: user.id,
          turma_id: formData.turma_id,
          disciplina_id: formData.disciplina_id || null,
          professor_id: formData.professor_id || null,
          data_aula: formData.data_aula,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          status_aula: formData.status_aula || "Agendada",
          observacoes: formData.observacoes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      toast.success("Aula agendada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao agendar aula:", error);
      toast.error("Erro ao agendar aula");
    },
  });

  const updateAula = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: AulaFormData }) => {
      const { data, error } = await supabase
        .from("cronograma_mestre")
        .update({
          turma_id: formData.turma_id,
          disciplina_id: formData.disciplina_id || null,
          professor_id: formData.professor_id || null,
          data_aula: formData.data_aula,
          hora_inicio: formData.hora_inicio,
          hora_fim: formData.hora_fim,
          status_aula: formData.status_aula,
          observacoes: formData.observacoes || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      toast.success("Aula atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar aula:", error);
      toast.error("Erro ao atualizar aula");
    },
  });

  const deleteAula = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cronograma_mestre")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      toast.success("Aula removida com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover aula:", error);
      toast.error("Erro ao remover aula");
    },
  });

  // Group aulas by turma for Gantt view
  const aulasByTurma = aulas.reduce((acc, aula) => {
    const turmaId = aula.turma_id || "sem-turma";
    if (!acc[turmaId]) {
      acc[turmaId] = {
        turma: aula.turma,
        aulas: [],
      };
    }
    acc[turmaId].aulas.push(aula);
    return acc;
  }, {} as Record<string, { turma: Aula["turma"]; aulas: Aula[] }>);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(currentWeekStart, i);
    return {
      date,
      dateStr: format(date, "yyyy-MM-dd"),
      dayName: format(date, "EEE", { locale: ptBR }),
      dayNumber: format(date, "dd"),
      isToday: format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
    };
  });

  return {
    aulas,
    aulasByTurma,
    weekDays,
    currentWeekStart,
    isLoading,
    error,
    turmas,
    professores,
    disciplinas,
    createAula,
    updateAula,
    deleteAula,
  };
};
