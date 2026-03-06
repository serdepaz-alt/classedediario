import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFeriados } from "@/hooks/useFeriados";
import { usePadroesDisciplinas, Turno, calcularQtdDias } from "@/hooks/usePadroesDisciplinas";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, format, isWeekend, parseISO } from "date-fns";

export interface SequenciaItem {
  ordem: number;
  nome: string;
  carga_horaria_total: number;
  carga_horaria_diaria: number;
  qtd_dias: number;
  data_inicio: string;
  data_termino: string;
}

interface Turma {
  id: string;
  nome: string;
  periodo: string | null;
  curso: string | null;
}

// Maps turma.periodo to padroes_disciplinas.turno
const mapPeriodoToTurno = (periodo: string | null): Turno => {
  switch (periodo) {
    case "Manhã": return "Matutino";
    case "Tarde": return "Vespertino";
    case "Noite": return "Noturno";
    case "Sábado": return "Intermediário";
    default: return "Matutino";
  }
};

export const useSequenciaDisciplinas = () => {
  const { user } = useAuth();
  const { feriados } = useFeriados();
  const queryClient = useQueryClient();

  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>("");
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [turno, setTurno] = useState<Turno>("Matutino");
  const [sequencia, setSequencia] = useState<SequenciaItem[]>([]);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isLoadingPadroes, setIsLoadingPadroes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const holidayDates = useMemo(
    () => feriados.map((f) => f.data),
    [feriados]
  );

  const fetchTurmas = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingTurmas(true);
    try {
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, periodo, curso")
        .eq("user_id", user.id)
        .order("nome");
      if (error) throw error;
      setTurmas(data || []);
    } catch (err) {
      console.error("Erro ao carregar turmas:", err);
      toast.error("Erro ao carregar turmas");
    } finally {
      setIsLoadingTurmas(false);
    }
  }, [user?.id]);

  const loadPadroes = useCallback(async (turmaId: string) => {
    const turma = turmas.find((t) => t.id === turmaId);
    if (!turma || !user?.id) return;

    setSelectedTurma(turma);
    setSelectedTurmaId(turmaId);
    const mappedTurno = mapPeriodoToTurno(turma.periodo);
    setTurno(mappedTurno);
    setIsLoadingPadroes(true);

    try {
      const { data, error } = await supabase
        .from("padroes_disciplinas")
        .select("*")
        .eq("user_id", user.id)
        .eq("turno", mappedTurno)
        .order("nome");

      if (error) throw error;

      const items: SequenciaItem[] = (data || []).map((p, idx) => ({
        ordem: idx + 1,
        nome: p.nome,
        carga_horaria_total: p.carga_horaria_total,
        carga_horaria_diaria: p.carga_horaria_diaria,
        qtd_dias: calcularQtdDias(p.carga_horaria_total, p.carga_horaria_diaria),
        data_inicio: "",
        data_termino: "",
      }));

      setSequencia(items);
    } catch (err) {
      console.error("Erro ao carregar padrões:", err);
      toast.error("Erro ao carregar padrões do turno");
    } finally {
      setIsLoadingPadroes(false);
    }
  }, [turmas, user?.id]);

  // Advance N business days from a start date, skipping weekends and holidays
  const advanceBusinessDays = useCallback(
    (start: Date, days: number): Date => {
      let current = start;
      let remaining = days;

      while (remaining > 0) {
        current = addDays(current, 1);
        const dateStr = format(current, "yyyy-MM-dd");
        if (!isWeekend(current) && !holidayDates.includes(dateStr)) {
          remaining--;
        }
      }
      return current;
    },
    [holidayDates]
  );

  // Find first business day on or after a date
  const firstBusinessDay = useCallback(
    (date: Date): Date => {
      let current = date;
      while (
        isWeekend(current) ||
        holidayDates.includes(format(current, "yyyy-MM-dd"))
      ) {
        current = addDays(current, 1);
      }
      return current;
    },
    [holidayDates]
  );

  const recalcularDatas = useCallback(
    (items: SequenciaItem[], startDate: string): SequenciaItem[] => {
      if (!startDate) return items.map((i) => ({ ...i, data_inicio: "", data_termino: "" }));

      let currentStart = firstBusinessDay(parseISO(startDate));

      return items.map((item, idx) => {
        const inicio = currentStart;
        const termino = advanceBusinessDays(inicio, item.qtd_dias - 1);
        const nextStart = advanceBusinessDays(termino, 1);

        const updated = {
          ...item,
          ordem: idx + 1,
          data_inicio: format(inicio, "yyyy-MM-dd"),
          data_termino: format(termino, "yyyy-MM-dd"),
        };

        currentStart = firstBusinessDay(nextStart);
        return updated;
      });
    },
    [advanceBusinessDays, firstBusinessDay]
  );

  const handleSetDataInicio = useCallback(
    (date: string) => {
      setDataInicio(date);
      setSequencia((prev) => recalcularDatas(prev, date));
    },
    [recalcularDatas]
  );

  const moveItem = useCallback(
    (fromIndex: number, direction: "up" | "down") => {
      setSequencia((prev) => {
        const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
        if (toIndex < 0 || toIndex >= prev.length) return prev;

        const newArr = [...prev];
        [newArr[fromIndex], newArr[toIndex]] = [newArr[toIndex], newArr[fromIndex]];
        return recalcularDatas(newArr, dataInicio);
      });
    },
    [dataInicio, recalcularDatas]
  );

  const validate = useCallback((): string | null => {
    if (!selectedTurmaId) return "Selecione uma turma.";
    if (!dataInicio) return "Defina a data de início.";
    if (sequencia.length === 0) return "Nenhuma disciplina carregada.";
    // Check date conflicts (overlap)
    for (let i = 1; i < sequencia.length; i++) {
      if (sequencia[i].data_inicio <= sequencia[i - 1].data_termino) {
        return `Conflito de datas entre "${sequencia[i - 1].nome}" e "${sequencia[i].nome}".`;
      }
    }
    return null;
  }, [selectedTurmaId, dataInicio, sequencia]);

  const salvar = useCallback(async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return false;
    }

    if (!user?.id || !selectedTurma) return false;
    setIsSaving(true);

    try {
      // Delete existing disciplinas for this turma to replace
      await supabase
        .from("disciplinas")
        .delete()
        .eq("turma_id", selectedTurmaId)
        .eq("user_id", user.id);

      // Insert all disciplinas in sequence
      const rows = sequencia.map((item) => ({
        user_id: user.id,
        turma_id: selectedTurmaId,
        nome: item.nome,
        turno: turno,
        curso: selectedTurma.curso || "",
        carga_horaria_total: item.carga_horaria_total,
        carga_horaria_diaria: item.carga_horaria_diaria,
        dias_uteis: item.qtd_dias,
        data_inicio: item.data_inicio,
        data_termino: item.data_termino,
      }));

      const { error: insertError } = await supabase
        .from("disciplinas")
        .insert(rows);

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ["disciplinas"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      toast.success(
        `Cronograma da turma "${selectedTurma.nome}" salvo com ${sequencia.length} disciplina(s)!`
      );
      return true;
    } catch (err) {
      console.error("Erro ao salvar cronograma:", err);
      toast.error("Erro ao salvar cronograma");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [validate, user?.id, selectedTurma, selectedTurmaId, sequencia, turno, queryClient]);

  const reset = useCallback(() => {
    setSelectedTurmaId("");
    setSelectedTurma(null);
    setSequencia([]);
    setDataInicio("");
  }, []);

  const cargaTotalCurso = useMemo(
    () => sequencia.reduce((acc, s) => acc + s.carga_horaria_total, 0),
    [sequencia]
  );

  const totalDiasCurso = useMemo(
    () => sequencia.reduce((acc, s) => acc + s.qtd_dias, 0),
    [sequencia]
  );

  return {
    turmas,
    selectedTurmaId,
    selectedTurma,
    turno,
    sequencia,
    dataInicio,
    isLoadingTurmas,
    isLoadingPadroes,
    isSaving,
    cargaTotalCurso,
    totalDiasCurso,
    fetchTurmas,
    loadPadroes,
    handleSetDataInicio,
    moveItem,
    validate,
    salvar,
    reset,
  };
};
