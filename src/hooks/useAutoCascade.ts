import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, format, isWeekend, parseISO } from "date-fns";

export interface CascadeChange {
  aulaId: string;
  turma: string;
  disciplina: string;
  professor: string;
  oldDate: string;
  newDate: string;
  horario: string;
}

export const useAutoCascade = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cascadeChanges, setCascadeChanges] = useState<CascadeChange[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const findNextAvailableDate = async (
    currentDate: string,
    professorId: string | null,
    holidays: string[]
  ): Promise<string> => {
    let candidate = addDays(parseISO(currentDate), 1);
    const maxAttempts = 60;

    for (let i = 0; i < maxAttempts; i++) {
      const candidateStr = format(candidate, "yyyy-MM-dd");

      // Skip weekends
      if (isWeekend(candidate)) {
        candidate = addDays(candidate, 1);
        continue;
      }

      // Skip holidays
      if (holidays.includes(candidateStr)) {
        candidate = addDays(candidate, 1);
        continue;
      }

      // Check professor conflict
      if (professorId) {
        const { data: conflicts } = await supabase
          .from("cronograma_mestre")
          .select("id")
          .eq("professor_id", professorId)
          .eq("data_aula", candidateStr)
          .limit(1);

        if (conflicts && conflicts.length > 0) {
          candidate = addDays(candidate, 1);
          continue;
        }
      }

      return candidateStr;
    }

    // Fallback: just next business day
    return format(candidate, "yyyy-MM-dd");
  };

  const calculateCascade = async (holidayDate: string) => {
    if (!user?.id) return;
    setIsCalculating(true);

    try {
      // Fetch all classes on the holiday date
      const { data: affectedAulas, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          id, data_aula, hora_inicio, hora_fim, professor_id,
          turma:turmas(nome),
          professor:cad_professores(nome),
          disciplina:cad_disciplinas(nome)
        `)
        .eq("user_id", user.id)
        .eq("data_aula", holidayDate)
        .not("status_aula", "in", '("Realizada","Cancelada")');

      if (error) throw error;
      if (!affectedAulas || affectedAulas.length === 0) {
        setCascadeChanges([]);
        setShowPreview(true);
        return;
      }

      // Fetch all holidays for conflict check
      const { data: allHolidays } = await supabase
        .from("feriados")
        .select("data")
        .eq("user_id", user.id);

      const holidayDates = (allHolidays || []).map((h) => h.data);

      // Calculate new dates
      const changes: CascadeChange[] = [];
      for (const aula of affectedAulas) {
        const newDate = await findNextAvailableDate(
          aula.data_aula,
          aula.professor_id,
          holidayDates
        );

        changes.push({
          aulaId: aula.id,
          turma: (aula.turma as any)?.nome || "Sem turma",
          disciplina: (aula.disciplina as any)?.nome || "Sem disciplina",
          professor: (aula.professor as any)?.nome || "Sem professor",
          oldDate: aula.data_aula,
          newDate,
          horario: `${aula.hora_inicio.slice(0, 5)} - ${aula.hora_fim.slice(0, 5)}`,
        });
      }

      setCascadeChanges(changes);
      setShowPreview(true);
    } catch (err) {
      console.error("Erro ao calcular cascade:", err);
      toast.error("Erro ao calcular realocação automática");
    } finally {
      setIsCalculating(false);
    }
  };

  const applyCascade = async (feriadoNome?: string, feriadoData?: string) => {
    if (cascadeChanges.length === 0) return;
    setIsApplying(true);

    try {
      for (const change of cascadeChanges) {
        const { error } = await supabase
          .from("cronograma_mestre")
          .update({ data_aula: change.newDate })
          .eq("id", change.aulaId);

        if (error) throw error;
      }

      // Log the cascade
      if (user?.id) {
        await supabase.from("cascade_logs").insert({
          user_id: user.id,
          feriado_data: feriadoData || cascadeChanges[0]?.oldDate,
          feriado_nome: feriadoNome || "Feriado",
          total_aulas_realocadas: cascadeChanges.length,
          detalhes: cascadeChanges.map((c) => ({
            turma: c.turma,
            disciplina: c.disciplina,
            professor: c.professor,
            de: c.oldDate,
            para: c.newDate,
            horario: c.horario,
          })),
        });
      }

      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      queryClient.invalidateQueries({ queryKey: ["cascade_logs"] });
      toast.success(
        `${cascadeChanges.length} aula(s) realocada(s) com sucesso!`
      );
      setShowPreview(false);
      setCascadeChanges([]);
    } catch (err) {
      console.error("Erro ao aplicar cascade:", err);
      toast.error("Erro ao aplicar realocação");
    } finally {
      setIsApplying(false);
    }
  };

  return {
    cascadeChanges,
    isCalculating,
    isApplying,
    showPreview,
    setShowPreview,
    calculateCascade,
    applyCascade,
  };
};
