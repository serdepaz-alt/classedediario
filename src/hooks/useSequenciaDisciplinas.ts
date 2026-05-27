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
  nome_professor: string;
}

interface Professor {
  id: string;
  nome: string;
}

interface Turma {
  id: string;
  nome: string;
  periodo: string | null;
  curso: string | null;
  data_inicio: string | null;
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
  const [professores, setProfessores] = useState<Professor[]>([]);
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
      const [turmasRes, profsRes] = await Promise.all([
        supabase
          .from("turmas")
          .select("id, nome, periodo, curso, data_inicio")
          .eq("user_id", user.id)
          .order("nome"),
        supabase
          .from("cad_professores")
          .select("id, nome")
          .eq("user_id", user.id)
          .eq("status", "Ativo")
          .order("nome"),
      ]);
      if (turmasRes.error) throw turmasRes.error;
      setTurmas(turmasRes.data || []);
      setProfessores(profsRes.data || []);
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

    // Auto-set data de início from turma's data_inicio
    const turmaDataInicio = turma.data_inicio || "";
    setDataInicio(turmaDataInicio);

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
        nome_professor: "",
      }));

      // If turma has data_inicio, calculate dates inline
      if (turmaDataInicio && items.length > 0) {
        let currentStart = parseISO(turmaDataInicio);
        // Skip to first business day
        while (isWeekend(currentStart) || holidayDates.includes(format(currentStart, "yyyy-MM-dd"))) {
          currentStart = addDays(currentStart, 1);
        }
        const calculated = items.map((item, idx) => {
          const inicio = currentStart;
          let end = inicio;
          let remaining = item.qtd_dias - 1;
          while (remaining > 0) {
            end = addDays(end, 1);
            const ds = format(end, "yyyy-MM-dd");
            if (!isWeekend(end) && !holidayDates.includes(ds)) remaining--;
          }
          // Next start
          let next = addDays(end, 1);
          while (isWeekend(next) || holidayDates.includes(format(next, "yyyy-MM-dd"))) {
            next = addDays(next, 1);
          }
          const updated = {
            ...item,
            ordem: idx + 1,
            data_inicio: format(inicio, "yyyy-MM-dd"),
            data_termino: format(end, "yyyy-MM-dd"),
          };
          currentStart = next;
          return updated;
        });
        setSequencia(calculated);
      } else {
        setSequencia(items);
      }
    } catch (err) {
      console.error("Erro ao carregar padrões:", err);
      toast.error("Erro ao carregar padrões do turno");
    } finally {
      setIsLoadingPadroes(false);
    }
  }, [turmas, user?.id, holidayDates]);

  // Load existing disciplinas from the database for editing
  const loadExistingSequencia = useCallback(async (turmaId: string) => {
    const turma = turmas.find((t) => t.id === turmaId);
    if (!turma || !user?.id) return;

    setSelectedTurma(turma);
    setSelectedTurmaId(turmaId);
    const mappedTurno = mapPeriodoToTurno(turma.periodo);
    setTurno(mappedTurno);
    setIsLoadingPadroes(true);

    try {
      const { data, error } = await supabase
        .from("disciplinas")
        .select("*")
        .eq("user_id", user.id)
        .eq("turma_id", turmaId)
        .order("data_inicio", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // No existing data, fall back to loading patterns
        setIsLoadingPadroes(false);
        await loadPadroes(turmaId);
        return;
      }

      const items: SequenciaItem[] = data.map((d, idx) => ({
        ordem: idx + 1,
        nome: d.nome,
        carga_horaria_total: d.carga_horaria_total || 0,
        carga_horaria_diaria: d.carga_horaria_diaria,
        qtd_dias: d.dias_uteis || 0,
        data_inicio: d.data_inicio,
        data_termino: d.data_termino,
        nome_professor: d.nome_professor || "",
      }));

      setSequencia(items);
      setDataInicio(items[0]?.data_inicio || "");
    } catch (err) {
      console.error("Erro ao carregar sequência existente:", err);
      toast.error("Erro ao carregar sequência da turma");
    } finally {
      setIsLoadingPadroes(false);
    }
  }, [turmas, user?.id, loadPadroes]);

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

  // Find last business day on or before a date
  const lastBusinessDay = useCallback(
    (date: Date): Date => {
      let current = date;
      while (
        isWeekend(current) ||
        holidayDates.includes(format(current, "yyyy-MM-dd"))
      ) {
        current = addDays(current, -1);
      }
      return current;
    },
    [holidayDates]
  );

  // Rewind N business days from an end date
  const rewindBusinessDays = useCallback(
    (end: Date, days: number): Date => {
      let current = end;
      let remaining = days;
      while (remaining > 0) {
        current = addDays(current, -1);
        const ds = format(current, "yyyy-MM-dd");
        if (!isWeekend(current) && !holidayDates.includes(ds)) {
          remaining--;
        }
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

  // Recalculate dates starting from a given index (preserves earlier items, cascades forward)
  const recalcularDatasDe = useCallback(
    (items: SequenciaItem[], fromIdx: number, startDate: string): SequenciaItem[] => {
      const result = items.map((item, i) => ({ ...item, ordem: i + 1 }));
      if (!startDate) return result;

      let currentStart = firstBusinessDay(parseISO(startDate));
      for (let i = fromIdx; i < result.length; i++) {
        const inicio = currentStart;
        const termino = advanceBusinessDays(inicio, result[i].qtd_dias - 1);
        result[i] = {
          ...result[i],
          data_inicio: format(inicio, "yyyy-MM-dd"),
          data_termino: format(termino, "yyyy-MM-dd"),
        };
        currentStart = firstBusinessDay(advanceBusinessDays(termino, 1));
      }
      return result;
    },
    [advanceBusinessDays, firstBusinessDay]
  );

  const setProfessor = useCallback((idx: number, nome: string) => {
    setSequencia((prev) => prev.map((item, i) => i === idx ? { ...item, nome_professor: nome } : item));
  }, []);

  // Swap the discipline at idx with another discipline currently in the sequence (by name)
  const swapDisciplina = useCallback(
    (idx: number, novoNome: string) => {
      setSequencia((prev) => {
        const targetIdx = prev.findIndex((p) => p.nome === novoNome);
        if (targetIdx === -1 || targetIdx === idx) return prev;
        const newArr = [...prev];
        [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        return recalcularDatas(newArr, dataInicio);
      });
    },
    [dataInicio, recalcularDatas]
  );

  // Edit a single item's start date — preserves qtd_dias, recomputes término and cascades forward
  const setItemDataInicio = useCallback(
    (idx: number, date: string) => {
      if (!date) return;
      setSequencia((prev) => recalcularDatasDe(prev, idx, date));
      if (idx === 0) setDataInicio(date);
    },
    [recalcularDatasDe]
  );

  // Count business days between two dates (inclusive), skipping weekends/holidays
  const countBusinessDaysInclusive = useCallback(
    (start: Date, end: Date): number => {
      if (end < start) return 0;
      let count = 0;
      let current = start;
      while (current <= end) {
        const ds = format(current, "yyyy-MM-dd");
        if (!isWeekend(current) && !holidayDates.includes(ds)) count++;
        current = addDays(current, 1);
      }
      return count;
    },
    [holidayDates]
  );

  // Edit a single item's end date — preserves data_inicio, recomputes qtd_dias + carga
  // and cascades forward through subsequent rows preserving their original carga horária.
  const setItemDataTermino = useCallback(
    (idx: number, date: string) => {
      if (!date) return;
      setSequencia((prev) => {
        const item = prev[idx];
        if (!item || !item.data_inicio) return prev;

        const inicio = firstBusinessDay(parseISO(item.data_inicio));
        const terminoSnap = lastBusinessDay(parseISO(date));
        if (terminoSnap < inicio) {
          toast.error("Data de Término não pode ser anterior à Data de Início.");
          return prev;
        }

        const novaQtdDias = countBusinessDaysInclusive(inicio, terminoSnap);
        const novaCarga = novaQtdDias * item.carga_horaria_diaria;

        const result = prev.map((it, i) => ({ ...it, ordem: i + 1 }));
        result[idx] = {
          ...result[idx],
          data_inicio: format(inicio, "yyyy-MM-dd"),
          data_termino: format(terminoSnap, "yyyy-MM-dd"),
          qtd_dias: novaQtdDias,
          carga_horaria_total: novaCarga,
        };

        // Cascade: subsequent rows keep their original carga_horaria_total.
        // Recompute qtd_dias from carga_horaria_total / carga_horaria_diaria,
        // then chain data_inicio/data_termino from the previous row.
        let cursor = firstBusinessDay(advanceBusinessDays(terminoSnap, 1));
        for (let i = idx + 1; i < result.length; i++) {
          const row = result[i];
          const diaria = row.carga_horaria_diaria || 1;
          const qtd = Math.max(
            1,
            Math.ceil((row.carga_horaria_total || 0) / diaria)
          );
          const ini = cursor;
          const fim = advanceBusinessDays(ini, qtd - 1);
          result[i] = {
            ...row,
            qtd_dias: qtd,
            data_inicio: format(ini, "yyyy-MM-dd"),
            data_termino: format(fim, "yyyy-MM-dd"),
          };
          cursor = firstBusinessDay(advanceBusinessDays(fim, 1));
        }

        if (idx === 0) setDataInicio(format(inicio, "yyyy-MM-dd"));
        return result;
      });
    },
    [firstBusinessDay, lastBusinessDay, advanceBusinessDays, countBusinessDaysInclusive]
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
        curso: selectedTurma.curso || "Técnico em Enfermagem",
        carga_horaria_total: item.carga_horaria_total,
        carga_horaria_diaria: item.carga_horaria_diaria,
        dias_uteis: item.qtd_dias,
        data_inicio: item.data_inicio,
        data_termino: item.data_termino,
        nome_professor: item.nome_professor || null,
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
    professores,
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
    loadExistingSequencia,
    handleSetDataInicio,
    moveItem,
    setProfessor,
    setItemDataInicio,
    setItemDataTermino,
    swapDisciplina,
    validate,
    salvar,
    reset,
  };
};
