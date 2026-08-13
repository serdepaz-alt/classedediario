import { useState, useCallback, useMemo, useRef } from "react";
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

export interface PadraoOption {
  nome: string;
  carga_horaria_total: number;
  carga_horaria_diaria: number;
  qtd_dias: number;
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
  const [sequenciaInicial, setSequenciaInicial] = useState<SequenciaItem[]>([]);
  const [padroesTurno, setPadroesTurno] = useState<PadraoOption[]>([]);
  const [dataInicio, setDataInicio] = useState<string>("");
  const [isLoadingTurmas, setIsLoadingTurmas] = useState(false);
  const [isLoadingPadroes, setIsLoadingPadroes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ids das disciplinas efetivamente alteradas no último salvamento — usados
  // para gerar/enviar contrato apenas para essas disciplinas.
  const alteradasIdsRef = useRef<string[]>([]);
  // Quantidade de disciplinas alteradas que possuem professor cadastrado vinculado.
  const alteradasComProfessorRef = useRef<number>(0);

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

      // Dedupe padroes by nome (keep first occurrence)
      const seen = new Set<string>();
      const padroesDedup = (data || []).filter((p) => {
        if (seen.has(p.nome)) return false;
        seen.add(p.nome);
        return true;
      });
      setPadroesTurno(
        padroesDedup.map((p) => ({
          nome: p.nome,
          carga_horaria_total: p.carga_horaria_total,
          carga_horaria_diaria: p.carga_horaria_diaria,
          qtd_dias: calcularQtdDias(p.carga_horaria_total, p.carga_horaria_diaria),
        }))
      );

      const items: SequenciaItem[] = padroesDedup.map((p, idx) => ({
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
        setSequenciaInicial(calculated);
      } else {
        setSequencia(items);
        setSequenciaInicial(items);
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
      const [discRes, padRes] = await Promise.all([
        supabase
          .from("disciplinas")
          .select("*")
          .eq("user_id", user.id)
          .eq("turma_id", turmaId)
          .order("data_inicio", { ascending: true }),
        supabase
          .from("padroes_disciplinas")
          .select("*")
          .eq("user_id", user.id)
          .eq("turno", mappedTurno)
          .order("nome"),
      ]);
      if (discRes.error) throw discRes.error;

      const seen = new Set<string>();
      const padroesDedup = (padRes.data || []).filter((p) => {
        if (seen.has(p.nome)) return false;
        seen.add(p.nome);
        return true;
      });
      setPadroesTurno(
        padroesDedup.map((p) => ({
          nome: p.nome,
          carga_horaria_total: p.carga_horaria_total,
          carga_horaria_diaria: p.carga_horaria_diaria,
          qtd_dias: calcularQtdDias(p.carga_horaria_total, p.carga_horaria_diaria),
        }))
      );

      const data = discRes.data;

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
      setSequenciaInicial(items);
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
        if (targetIdx === idx) return prev;
        const newArr = [...prev];
        if (targetIdx !== -1) {
          // Swap positions of two existing disciplines
          [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
        } else {
          // Replace current row with a discipline from the turno's padroes
          const padrao = padroesTurno.find((p) => p.nome === novoNome);
          if (!padrao) return prev;
          newArr[idx] = {
            ...newArr[idx],
            nome: padrao.nome,
            carga_horaria_total: padrao.carga_horaria_total,
            carga_horaria_diaria: padrao.carga_horaria_diaria,
            qtd_dias: padrao.qtd_dias,
            nome_professor: "",
          };
        }
        return recalcularDatas(newArr, dataInicio);
      });
    },
    [dataInicio, recalcularDatas, padroesTurno]
  );

  // Edit a single item's start date — snaps to the first business day, preserves each
  // discipline's carga horária (qtd_dias = carga total / carga diária) and cascades
  // all subsequent disciplines forward, skipping weekends and holidays.
  const setItemDataInicio = useCallback(
    (idx: number, date: string) => {
      if (!date) return;
      setSequencia((prev) => {
        const result = prev.map((it, i) => ({ ...it, ordem: i + 1 }));
        if (!result[idx]) return prev;

        let cursor = firstBusinessDay(parseISO(date));
        for (let i = idx; i < result.length; i++) {
          const row = result[i];
          const diaria = row.carga_horaria_diaria || 1;
          const qtd = row.carga_horaria_total
            ? Math.max(1, Math.ceil(row.carga_horaria_total / diaria))
            : Math.max(1, row.qtd_dias || 1);
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

        if (idx === 0) setDataInicio(result[0].data_inicio);
        return result;
      });
    },
    [firstBusinessDay, advanceBusinessDays]
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
      // Preserve attendance: UPSERT by nome instead of delete+insert.
      // presencas.disciplina_id has ON DELETE CASCADE, so deleting a disciplina
      // wipes its chamadas. We keep the same row id when the nome matches.
      const { data: existentes, error: fetchErr } = await supabase
        .from("disciplinas")
        .select("id, nome, data_inicio")
        .eq("user_id", user.id)
        .eq("turma_id", selectedTurmaId)
        .order("data_inicio", { ascending: true });
      if (fetchErr) throw fetchErr;

      // Uma turma pode ter disciplinas com o MESMO nome repetidas na sequência.
      // Por isso mapeamos nome -> fila de ids (ordenada por data de início) e
      // consumimos um id por linha, evitando que duas linhas gravem no mesmo
      // registro (o que fazia a última sobrescrever a anterior e a alteração
      // "não continuar" após salvar).
      const filaPorNome = new Map<string, string[]>();
      (existentes || []).forEach((d) => {
        const fila = filaPorNome.get(d.nome) || [];
        fila.push(d.id);
        filaPorNome.set(d.nome, fila);
      });
      const idsUsados = new Set<string>();

      // Chave por ocorrência (nome + n-ésima repetição) para comparar cada
      // linha com seu estado inicial, mesmo com nomes repetidos na turma.
      const occKey = (nome: string, n: number) => `${nome}#${n}`;
      const contadorInicial = new Map<string, number>();
      const inicialPorChave = new Map<string, SequenciaItem>();
      sequenciaInicial.forEach((s) => {
        const n = contadorInicial.get(s.nome) ?? 0;
        contadorInicial.set(s.nome, n + 1);
        inicialPorChave.set(occKey(s.nome, n), s);
      });
      const contadorAtual = new Map<string, number>();
      const foiAlterado = (item: SequenciaItem) => {
        const n = contadorAtual.get(item.nome) ?? 0;
        contadorAtual.set(item.nome, n + 1);
        const original = inicialPorChave.get(occKey(item.nome, n));
        if (!original) return true; // disciplina nova
        return (
          original.nome_professor !== item.nome_professor ||
          original.data_inicio !== item.data_inicio ||
          original.data_termino !== item.data_termino ||
          original.carga_horaria_total !== item.carga_horaria_total ||
          original.carga_horaria_diaria !== item.carga_horaria_diaria ||
          original.qtd_dias !== item.qtd_dias ||
          original.ordem !== item.ordem
        );
      };
      const alteradasIds: string[] = [];
      const alteradasNovas: string[] = [];
      const profNamesSet = new Set(professores.map((p) => p.nome));
      let alteradasComProfessor = 0;

      const baseRow = (item: typeof sequencia[number]) => ({
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
      });

      // UPDATE existing + INSERT new
      const toInsert: ReturnType<typeof baseRow>[] = [];
      for (const item of sequencia) {
        const fila = filaPorNome.get(item.nome);
        const existingId = fila && fila.length > 0 ? fila.shift() : undefined;
        const alterado = foiAlterado(item);
        if (alterado && item.nome_professor && profNamesSet.has(item.nome_professor)) {
          alteradasComProfessor++;
        }
        if (existingId) {
          idsUsados.add(existingId);
          if (alterado) alteradasIds.push(existingId);
          const { error: updErr } = await supabase
            .from("disciplinas")
            .update(baseRow(item))
            .eq("id", existingId);
          if (updErr) throw updErr;
        } else {
          alteradasNovas.push(item.nome);
          toInsert.push(baseRow(item));
        }
      }
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from("disciplinas").insert(toInsert);
        if (insErr) throw insErr;
        const { data: recemCriadas } = await supabase
          .from("disciplinas")
          .select("id, nome")
          .eq("user_id", user.id)
          .eq("turma_id", selectedTurmaId)
          .in("nome", alteradasNovas);
        (recemCriadas || []).forEach((d) => {
          if (!idsUsados.has(d.id) && !alteradasIds.includes(d.id)) alteradasIds.push(d.id);
        });
      }
      alteradasIdsRef.current = alteradasIds;
      alteradasComProfessorRef.current = alteradasComProfessor;

      // Delete disciplinas removed from the sequence — but only if they have NO chamadas.
      const removidas = (existentes || []).filter((d) => !idsUsados.has(d.id));
      let preservadasComChamadas = 0;
      for (const rem of removidas) {
        const { count } = await supabase
          .from("presencas")
          .select("id", { count: "exact", head: true })
          .eq("disciplina_id", rem.id);
        if ((count || 0) > 0) {
          preservadasComChamadas++;
          continue;
        }
        await supabase.from("disciplinas").delete().eq("id", rem.id);
      }
      if (preservadasComChamadas > 0) {
        toast.warning(
          `${preservadasComChamadas} disciplina(s) removida(s) da sequência foram mantidas porque possuem chamadas registradas.`
        );
      }

      // Persist the turma start date along with the sequence
      if (dataInicio) {
        const { error: turmaErr } = await supabase
          .from("turmas")
          .update({ data_inicio: dataInicio })
          .eq("id", selectedTurmaId);
        if (turmaErr) throw turmaErr;
      }

      queryClient.invalidateQueries({ queryKey: ["disciplinas"] });
      queryClient.invalidateQueries({ queryKey: ["cronograma"] });
      queryClient.invalidateQueries({ queryKey: ["turmas"] });
      // Persisted state becomes the new baseline so the saved changes are not
      // lost or re-flagged as pending, regardless of the e-mail decision.
      setSequenciaInicial(sequencia.map((s) => ({ ...s })));
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
  }, [validate, user?.id, selectedTurma, selectedTurmaId, sequencia, turno, dataInicio, queryClient, professores]);

  // Returns the set of discipline names that have been modified vs. the
  // initial loaded state. New disciplines also count as modified.
  const getDisciplinasModificadas = useCallback((): Set<string> => {
    const inicialMap = new Map(sequenciaInicial.map((s) => [s.nome, s]));
    const modified = new Set<string>();
    sequencia.forEach((s) => {
      const original = inicialMap.get(s.nome);
      if (!original) {
        modified.add(s.nome);
        return;
      }
      if (
        original.nome_professor !== s.nome_professor ||
        original.data_inicio !== s.data_inicio ||
        original.data_termino !== s.data_termino ||
        original.carga_horaria_total !== s.carga_horaria_total ||
        original.carga_horaria_diaria !== s.carga_horaria_diaria ||
        original.qtd_dias !== s.qtd_dias ||
        original.ordem !== s.ordem
      ) {
        modified.add(s.nome);
      }
    });
    return modified;
  }, [sequencia, sequenciaInicial]);

  // Conta professores das disciplinas ALTERADAS no último salvamento.
  const contarProfessoresVinculados = useCallback(
    (): number => alteradasComProfessorRef.current,
    []
  );

  const gerarContratos = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !selectedTurmaId) return false;
    try {
      const alteradasIds = alteradasIdsRef.current;
      if (alteradasIds.length === 0) {
        toast.info("Nenhuma disciplina foi modificada — nenhum contrato a enviar.");
        return true;
      }
      const { data: savedDisciplinas } = await supabase
        .from("disciplinas")
        .select("id, nome, nome_professor")
        .eq("user_id", user.id)
        .eq("turma_id", selectedTurmaId)
        .in("id", alteradasIds);

      const profMap = new Map(professores.map((p) => [p.nome, p.id]));
      const targets = (savedDisciplinas || []).filter(
        (d) => d.nome_professor && profMap.has(d.nome_professor)
      );

      if (targets.length === 0) {
        toast.info("Nenhuma disciplina com professor vinculado para gerar contrato.");
        return true;
      }

      toast.info(`Gerando ${targets.length} contrato(s)...`);
      const results = await Promise.allSettled(
        targets.map((d) =>
          supabase.functions.invoke("generate-professor-contract", {
            body: {
              professor_id: profMap.get(d.nome_professor!),
              disciplina_id: d.id,
              turma_id: selectedTurmaId,
            },
          })
        )
      );

      let sent = 0;
      let skipped = 0;
      const warnings: string[] = [];
      results.forEach((r, idx) => {
        const profName = targets[idx].nome_professor!;
        if (r.status === "fulfilled" && !r.value.error) {
          const data: any = r.value.data;
          if (data?.skipped) skipped++;
          else {
            sent++;
            if (data?.missing_fields?.length) {
              warnings.push(`${profName}: faltam ${data.missing_fields.join(", ")}`);
            }
            if (data?.email_error) {
              warnings.push(`${profName}: e-mail não enviado (${data.email_error})`);
            }
          }
        } else {
          warnings.push(`${profName}: falha ao gerar contrato`);
        }
      });

      if (sent > 0) toast.success(`${sent} contrato(s) gerado(s) e e-mail(s) enviado(s).`);
      if (skipped > 0) toast.info(`${skipped} contrato(s) já existiam.`);
      warnings.slice(0, 5).forEach((w) => toast.warning(w));
      return true;
    } catch (e) {
      console.error("Erro ao gerar contratos:", e);
      toast.warning("Houve falha na geração de contratos.");
      return false;
    }
  }, [user?.id, selectedTurmaId, professores]);

  const reset = useCallback(() => {
    setSelectedTurmaId("");
    setSelectedTurma(null);
    setSequencia([]);
    setSequenciaInicial([]);
    setPadroesTurno([]);
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
    padroesTurno,
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
    gerarContratos,
    contarProfessoresVinculados,
    reset,
  };
};
