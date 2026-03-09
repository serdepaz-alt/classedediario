import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface ProfessorStats {
  professorId: string;
  totalAulas: number;
  aulasMesAtual: number;
  totalHoras: number;
  turmas: string[];
}

export const useProfessorStats = (professorIds: string[]) => {
  const { user } = useAuth();
  const now = new Date();
  const mesAtualInicio = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const mesAtualFim = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-31`;

  return useQuery({
    queryKey: ["professor-stats", user?.id, professorIds],
    queryFn: async (): Promise<Record<string, ProfessorStats>> => {
      if (!user?.id || professorIds.length === 0) return {};

      const stats: Record<string, ProfessorStats> = {};
      for (const id of professorIds) {
        stats[id] = { professorId: id, totalAulas: 0, aulasMesAtual: 0, totalHoras: 0, turmas: [] };
      }

      // Fetch all cronograma entries for these professors
      const { data: aulas } = await supabase
        .from("cronograma_mestre")
        .select("professor_id, data_aula, hora_inicio, hora_fim, status_aula, turma:turmas(nome)")
        .eq("user_id", user.id)
        .in("professor_id", professorIds)
        .neq("status_aula", "Cancelada");

      if (aulas) {
        const turmaSet: Record<string, Set<string>> = {};

        for (const a of aulas) {
          const pid = a.professor_id;
          if (!pid || !stats[pid]) continue;

          stats[pid].totalAulas++;

          // Mes atual
          if (a.data_aula >= mesAtualInicio && a.data_aula <= mesAtualFim) {
            stats[pid].aulasMesAtual++;
          }

          // Horas
          try {
            const [h1, m1] = a.hora_inicio.split(":").map(Number);
            const [h2, m2] = a.hora_fim.split(":").map(Number);
            stats[pid].totalHoras += (h2 * 60 + m2 - h1 * 60 - m1) / 60;
          } catch {}

          // Turmas
          const turmaNome = (a.turma as any)?.nome;
          if (turmaNome) {
            if (!turmaSet[pid]) turmaSet[pid] = new Set();
            turmaSet[pid].add(turmaNome);
          }
        }

        for (const [pid, set] of Object.entries(turmaSet)) {
          stats[pid].turmas = Array.from(set);
        }
      }

      return stats;
    },
    enabled: !!user?.id && professorIds.length > 0,
    staleTime: 30000,
  });
};
