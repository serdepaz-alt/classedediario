import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface TurmaStats {
  turmaId: string;
  totalAlunos: number;
  mediaGeral: number;
  frequencia: number;
  disciplinaAtual: string | null;
  totalDisciplinas: number;
  disciplinasConcluidas: number;
  progressoPercent: number;
}

export const useTurmaStats = (turmaIds: string[]) => {
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];

  return useQuery({
    queryKey: ["turma-stats", user?.id, turmaIds],
    queryFn: async (): Promise<Record<string, TurmaStats>> => {
      if (!user?.id || turmaIds.length === 0) return {};

      const stats: Record<string, TurmaStats> = {};

      // Initialize
      for (const id of turmaIds) {
        stats[id] = {
          turmaId: id,
          totalAlunos: 0,
          mediaGeral: 0,
          frequencia: 0,
          disciplinaAtual: null,
          totalDisciplinas: 0,
          disciplinasConcluidas: 0,
          progressoPercent: 0,
        };
      }

      // 1. Count students per turma
      const { data: students } = await supabase
        .from("students")
        .select("turma_id")
        .eq("user_id", user.id)
        .in("turma_id", turmaIds)
        .eq("status", "Ativo");

      if (students) {
        for (const s of students) {
          if (s.turma_id && stats[s.turma_id]) {
            stats[s.turma_id].totalAlunos++;
          }
        }
      }

      // 2. Get disciplinas per turma (for progress + current)
      const { data: disciplinas } = await supabase
        .from("disciplinas")
        .select("turma_id, nome, data_inicio, data_termino")
        .eq("user_id", user.id)
        .in("turma_id", turmaIds);

      if (disciplinas) {
        for (const d of disciplinas) {
          if (d.turma_id && stats[d.turma_id]) {
            stats[d.turma_id].totalDisciplinas++;
            if (d.data_termino < today) {
              stats[d.turma_id].disciplinasConcluidas++;
            }
            if (d.data_inicio <= today && d.data_termino >= today) {
              stats[d.turma_id].disciplinaAtual = d.nome;
            }
          }
        }
        // Calculate progress
        for (const id of turmaIds) {
          const s = stats[id];
          s.progressoPercent = s.totalDisciplinas > 0
            ? Math.round((s.disciplinasConcluidas / s.totalDisciplinas) * 100)
            : 0;
        }
      }

      // 3. Get medias_alunos for average calculation
      const { data: medias } = await supabase
        .from("medias_alunos")
        .select("student_id, media_final, disciplina_id")
        .eq("user_id", user.id);

      if (medias && students) {
        // Map student to turma
        const studentTurmaMap: Record<string, string> = {};
        const { data: allStudents } = await supabase
          .from("students")
          .select("id, turma_id")
          .eq("user_id", user.id)
          .in("turma_id", turmaIds);

        if (allStudents) {
          for (const s of allStudents) {
            if (s.turma_id) studentTurmaMap[s.id] = s.turma_id;
          }
        }

        const turmaMedias: Record<string, number[]> = {};
        for (const m of medias) {
          const turmaId = studentTurmaMap[m.student_id];
          if (turmaId && stats[turmaId]) {
            if (!turmaMedias[turmaId]) turmaMedias[turmaId] = [];
            if (m.media_final !== null && m.media_final !== undefined) {
              turmaMedias[turmaId].push(Number(m.media_final));
            }
          }
        }

        for (const [turmaId, values] of Object.entries(turmaMedias)) {
          if (values.length > 0) {
            stats[turmaId].mediaGeral = values.reduce((a, b) => a + b, 0) / values.length;
          }
        }
      }

      // 4. Get attendance stats
      const { data: presencas } = await supabase
        .from("presencas")
        .select("student_id, status")
        .eq("user_id", user.id);

      if (presencas) {
        const studentTurmaMap: Record<string, string> = {};
        const { data: allStudents } = await supabase
          .from("students")
          .select("id, turma_id")
          .eq("user_id", user.id)
          .in("turma_id", turmaIds);

        if (allStudents) {
          for (const s of allStudents) {
            if (s.turma_id) studentTurmaMap[s.id] = s.turma_id;
          }
        }

        const turmaPresencas: Record<string, { total: number; presentes: number }> = {};
        for (const p of presencas) {
          if (!p.student_id) continue;
          const turmaId = studentTurmaMap[p.student_id];
          if (turmaId && stats[turmaId]) {
            if (!turmaPresencas[turmaId]) turmaPresencas[turmaId] = { total: 0, presentes: 0 };
            turmaPresencas[turmaId].total++;
            if (p.status === "presente") {
              turmaPresencas[turmaId].presentes++;
            }
          }
        }

        for (const [turmaId, data] of Object.entries(turmaPresencas)) {
          stats[turmaId].frequencia = data.total > 0
            ? Math.round((data.presentes / data.total) * 100)
            : 0;
        }
      }

      return stats;
    },
    enabled: !!user?.id && turmaIds.length > 0,
    staleTime: 30000,
  });
};
