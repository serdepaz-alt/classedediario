import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Conflict {
  type: "professor" | "turma";
  message: string;
  severity: "error" | "warning";
  aulaId: string;
  turmaName?: string;
  professorName?: string;
}

interface ConflictCheckParams {
  professor_id?: string;
  turma_id?: string;
  data_aula: string;
  hora_inicio: string;
  hora_fim: string;
  exclude_aula_id?: string;
}

export const useConflictDetection = (params: ConflictCheckParams | null) => {
  const { user } = useAuth();

  const { data: conflicts = [], isLoading } = useQuery({
    queryKey: [
      "conflict-check",
      params?.professor_id,
      params?.turma_id,
      params?.data_aula,
      params?.hora_inicio,
      params?.hora_fim,
      params?.exclude_aula_id,
    ],
    queryFn: async (): Promise<Conflict[]> => {
      if (!user?.id || !params?.data_aula || !params?.hora_inicio || !params?.hora_fim) return [];

      const found: Conflict[] = [];

      // Check professor conflicts
      if (params.professor_id) {
        const query = supabase
          .from("cronograma_mestre")
          .select("id, hora_inicio, hora_fim, turma:turmas(nome)")
          .eq("user_id", user.id)
          .eq("professor_id", params.professor_id)
          .eq("data_aula", params.data_aula)
          .in("status_aula", ["Agendada", "Confirmada"]);

        if (params.exclude_aula_id) {
          query.neq("id", params.exclude_aula_id);
        }

        const { data, error } = await query;
        if (!error && data) {
          for (const aula of data) {
            if (hasTimeOverlap(params.hora_inicio, params.hora_fim, aula.hora_inicio, aula.hora_fim)) {
              const turmaName = (aula.turma as any)?.nome || "outra turma";
              found.push({
                type: "professor",
                severity: "error",
                message: `Professor já alocado das ${aula.hora_inicio.slice(0, 5)} às ${aula.hora_fim.slice(0, 5)} na turma "${turmaName}"`,
                aulaId: aula.id,
                turmaName,
              });
            }
          }
        }
      }

      // Check turma conflicts (same turma, same time)
      if (params.turma_id) {
        const query = supabase
          .from("cronograma_mestre")
          .select("id, hora_inicio, hora_fim, professor:cad_professores(nome)")
          .eq("user_id", user.id)
          .eq("turma_id", params.turma_id)
          .eq("data_aula", params.data_aula)
          .in("status_aula", ["Agendada", "Confirmada"]);

        if (params.exclude_aula_id) {
          query.neq("id", params.exclude_aula_id);
        }

        const { data, error } = await query;
        if (!error && data) {
          for (const aula of data) {
            if (hasTimeOverlap(params.hora_inicio, params.hora_fim, aula.hora_inicio, aula.hora_fim)) {
              const profName = (aula.professor as any)?.nome || "outro professor";
              found.push({
                type: "turma",
                severity: "warning",
                message: `Turma já tem aula das ${aula.hora_inicio.slice(0, 5)} às ${aula.hora_fim.slice(0, 5)} com "${profName}"`,
                aulaId: aula.id,
                professorName: profName,
              });
            }
          }
        }
      }

      return found;
    },
    enabled: !!user?.id && !!params?.data_aula && !!params?.hora_inicio && !!params?.hora_fim && (!!params?.professor_id || !!params?.turma_id),
    staleTime: 5000,
  });

  const hasErrors = conflicts.some((c) => c.severity === "error");
  const hasWarnings = conflicts.some((c) => c.severity === "warning");

  return { conflicts, isLoading, hasErrors, hasWarnings };
};

function hasTimeOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}
