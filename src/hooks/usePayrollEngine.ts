import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePayroll, TabelaValorHora } from "@/hooks/usePayroll";

export interface PayrollLineItem {
  professor_id: string;
  professor_nome: string;
  turma_nome: string;
  disciplina_nome: string;
  turno: string;
  horas_realizadas: number;
  valor_hora: number;
  subtotal_aulas: number;
  dsr: number;
  total_aulas: number;
  // estágio
  estagios: {
    unidade: string;
    valor_base: number;
    dias: number;
    vt_total: number;
    va_total: number;
    subtotal: number;
  }[];
  total_estagio: number;
  total_geral: number;
}

export interface PayrollSummary {
  total_bruto: number;
  total_dsr: number;
  total_estagios: number;
  total_geral: number;
  professores_count: number;
  horas_totais: number;
  alertas: string[];
}

const DSR_RATE = 0.1667; // 16.67%

export const usePayrollEngine = (mesReferencia: string) => {
  const { user } = useAuth();
  const { valoresHora, valoresEstagio } = usePayroll();

  const { data: cronogramaData, isLoading: loadingCronograma } = useQuery({
    queryKey: ["payroll-cronograma", user?.id, mesReferencia],
    queryFn: async () => {
      if (!user?.id || !mesReferencia) return [];
      const startDate = `${mesReferencia}-01`;
      const endDate = new Date(parseInt(mesReferencia.split("-")[0]), parseInt(mesReferencia.split("-")[1]), 0)
        .toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("cronograma_mestre")
        .select(`
          id, data_aula, hora_inicio, hora_fim, valor_calculado, status_aula,
          professor_id, turma_id, disciplina_id,
          professor:cad_professores(id, nome, valor_hora),
          turma:turmas(id, nome),
          disciplina:cad_disciplinas(id, nome)
        `)
        .eq("user_id", user.id)
        .gte("data_aula", startDate)
        .lte("data_aula", endDate)
        .in("status_aula", ["Realizada", "Confirmada", "Agendada"])
        .order("data_aula", { ascending: true });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id && !!mesReferencia,
  });

  // Build payroll by professor
  const buildPayroll = (): { lineItems: PayrollLineItem[]; summary: PayrollSummary } => {
    if (!cronogramaData?.length) {
      return {
        lineItems: [],
        summary: { total_bruto: 0, total_dsr: 0, total_estagios: 0, total_geral: 0, professores_count: 0, horas_totais: 0, alertas: [] },
      };
    }

    const byProfessor: Record<string, any[]> = {};
    cronogramaData.forEach((aula) => {
      const pid = aula.professor_id || "sem_professor";
      if (!byProfessor[pid]) byProfessor[pid] = [];
      byProfessor[pid].push(aula);
    });

    const lineItems: PayrollLineItem[] = [];
    const alertas: string[] = [];

    Object.entries(byProfessor).forEach(([profId, aulas]) => {
      const prof = aulas[0]?.professor;
      const profNome = prof?.nome || "Professor não vinculado";

      // Group by turma+disciplina
      const byTurmaDisciplina: Record<string, any[]> = {};
      aulas.forEach((a) => {
        const key = `${a.turma_id}_${a.disciplina_id}`;
        if (!byTurmaDisciplina[key]) byTurmaDisciplina[key] = [];
        byTurmaDisciplina[key].push(a);
      });

      Object.values(byTurmaDisciplina).forEach((group) => {
        const turma = group[0]?.turma?.nome || "Sem turma";
        const disciplina = group[0]?.disciplina?.nome || "Sem disciplina";

        let totalHoras = 0;
        group.forEach((a) => {
          const [hi, mi] = (a.hora_inicio || "08:00").split(":").map(Number);
          const [hf, mf] = (a.hora_fim || "12:00").split(":").map(Number);
          totalHoras += (hf + mf / 60) - (hi + mi / 60);
        });

        // Determine turno based on majority of classes
        const turno = determineTurno(group);

        // Find matching valor_hora from table or professor default
        const tabelaValor = valoresHora.find(
          (v) => v.turno === turno && v.ativo
        );
        const valorHora = tabelaValor ? Number(tabelaValor.valor_hora) : Number(prof?.valor_hora || 50);

        const subtotalAulas = totalHoras * valorHora;
        const dsr = subtotalAulas * DSR_RATE;
        const totalAulas = subtotalAulas + dsr;

        // Check for estágios (match by disciplina name containing "estágio" or "estagio")
        const estagioItems = valoresEstagio.filter((e) => e.ativo);
        const estagios = disciplina.toLowerCase().includes("estágio") || disciplina.toLowerCase().includes("estagio")
          ? estagioItems.map((e) => ({
              unidade: e.unidade_hospitalar,
              valor_base: Number(e.valor_base),
              dias: e.dias_padrao,
              vt_total: e.dias_padrao * Number(e.valor_vt),
              va_total: e.dias_padrao * Number(e.valor_va),
              subtotal: Number(e.custo_total_calculado),
            }))
          : [];

        const totalEstagio = estagios.reduce((s, e) => s + e.subtotal, 0);

        lineItems.push({
          professor_id: profId,
          professor_nome: profNome,
          turma_nome: turma,
          disciplina_nome: disciplina,
          turno,
          horas_realizadas: Math.round(totalHoras * 100) / 100,
          valor_hora: valorHora,
          subtotal_aulas: Math.round(subtotalAulas * 100) / 100,
          dsr: Math.round(dsr * 100) / 100,
          total_aulas: Math.round(totalAulas * 100) / 100,
          estagios,
          total_estagio: totalEstagio,
          total_geral: Math.round((totalAulas + totalEstagio) * 100) / 100,
        });

        // Alerts
        if (totalHoras > 200) {
          alertas.push(`⚠️ ${profNome}: ${totalHoras.toFixed(0)}h excedem limite de 200h/mês`);
        }
        if (!tabelaValor) {
          alertas.push(`⚠️ ${disciplina} (${turno}): sem valor oficial na tabela, usando valor padrão do professor`);
        }
      });
    });

    const professoresUnicos = new Set(lineItems.map((l) => l.professor_id));
    const summary: PayrollSummary = {
      total_bruto: lineItems.reduce((s, l) => s + l.subtotal_aulas, 0),
      total_dsr: lineItems.reduce((s, l) => s + l.dsr, 0),
      total_estagios: lineItems.reduce((s, l) => s + l.total_estagio, 0),
      total_geral: lineItems.reduce((s, l) => s + l.total_geral, 0),
      professores_count: professoresUnicos.size,
      horas_totais: lineItems.reduce((s, l) => s + l.horas_realizadas, 0),
      alertas,
    };

    return { lineItems, summary };
  };

  const { lineItems, summary } = buildPayroll();

  return { lineItems, summary, isLoading: loadingCronograma };
};

function determineTurno(aulas: any[]): string {
  let diurno = 0, noturno = 0, sabado = 0;
  aulas.forEach((a) => {
    const day = new Date(a.data_aula + "T00:00:00").getDay();
    if (day === 6) { sabado++; return; }
    const hora = parseInt((a.hora_inicio || "08:00").split(":")[0]);
    if (hora >= 18) noturno++;
    else diurno++;
  });
  if (sabado >= diurno && sabado >= noturno) return "Sábado";
  if (noturno >= diurno) return "Noturno";
  return "Diurno";
}
