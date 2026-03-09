import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";

interface DashboardStats {
  totalStudents: number;
  avgAttendance: number;
  avgGrade: number;
  totalLessons: number;
  attendanceChange: string;
  gradeChange: string;
}

interface RecentActivity {
  type: "grade" | "attendance" | "note" | "lesson";
  student: string;
  action: string;
  time: string;
}

interface ActiveDisciplina {
  id: string;
  nome: string;
  turma_id: string | null;
  turma_nome: string | null;
  turno: string;
  curso: string;
  data_inicio: string;
  data_termino: string;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    avgAttendance: 0,
    avgGrade: 0,
    totalLessons: 0,
    attendanceChange: "",
    gradeChange: "",
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [activeDisciplina, setActiveDisciplina] = useState<ActiveDisciplina | null>(null);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);
  const monthStart = useMemo(() => format(startOfMonth(new Date()), "yyyy-MM-dd"), []);
  const monthEnd = useMemo(() => format(endOfMonth(new Date()), "yyyy-MM-dd"), []);

  useEffect(() => {
    if (!user?.id) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        // 1. Find active discipline (today falls between data_inicio and data_termino)
        const { data: disciplinas } = await supabase
          .from("disciplinas")
          .select("id, nome, turno, curso, data_inicio, data_termino, turma_id")
          .eq("user_id", user.id)
          .lte("data_inicio", today)
          .gte("data_termino", today)
          .order("data_inicio", { ascending: false })
          .limit(1);

        let currentDisciplina: ActiveDisciplina | null = null;
        let turmaId: string | null = null;

        if (disciplinas && disciplinas.length > 0) {
          const d = disciplinas[0];
          turmaId = d.turma_id;

          // Get turma name
          let turmaNome: string | null = null;
          if (turmaId) {
            const { data: turma } = await supabase
              .from("turmas")
              .select("nome")
              .eq("id", turmaId)
              .single();
            turmaNome = turma?.nome ?? null;
          }

          currentDisciplina = {
            id: d.id,
            nome: d.nome,
            turma_id: turmaId,
            turma_nome: turmaNome,
            turno: d.turno,
            curso: d.curso,
            data_inicio: d.data_inicio,
            data_termino: d.data_termino,
          };
          setActiveDisciplina(currentDisciplina);
        } else {
          // Fallback: get first active turma
          const { data: turmas } = await supabase
            .from("turmas")
            .select("id, nome")
            .eq("user_id", user.id)
            .eq("status", "Ativa")
            .limit(1);
          if (turmas && turmas.length > 0) {
            turmaId = turmas[0].id;
          }
          setActiveDisciplina(null);
        }

        // 2. Count students in this turma (or all)
        let studentsQuery = supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "Ativo");
        if (turmaId) studentsQuery = studentsQuery.eq("turma_id", turmaId);
        const { count: studentCount } = await studentsQuery;

        // 3. Attendance average for current discipline this month
        let attendanceQuery = supabase
          .from("presencas")
          .select("status")
          .eq("user_id", user.id)
          .gte("data", monthStart)
          .lte("data", monthEnd);
        if (currentDisciplina) {
          attendanceQuery = attendanceQuery.eq("disciplina_id", currentDisciplina.id);
        }
        const { data: presencas } = await attendanceQuery;

        let avgAtt = 0;
        if (presencas && presencas.length > 0) {
          const presentCount = presencas.filter(
            (p) => p.status === "presente" || p.status === "atrasado"
          ).length;
          avgAtt = Math.round((presentCount / presencas.length) * 100);
        }

        // 4. Grade average for current discipline
        let gradesQuery = supabase
          .from("notas")
          .select("valor")
          .eq("user_id", user.id)
          .not("valor", "is", null);
        if (currentDisciplina) {
          gradesQuery = gradesQuery.eq("disciplina_id", currentDisciplina.id);
        }
        const { data: notas } = await gradesQuery;

        let avgGrade = 0;
        if (notas && notas.length > 0) {
          const validNotas = notas.filter((n) => n.valor !== null);
          if (validNotas.length > 0) {
            avgGrade = Number(
              (validNotas.reduce((sum, n) => sum + (n.valor ?? 0), 0) / validNotas.length).toFixed(1)
            );
          }
        }

        // 5. Total lessons (conteudo_programatico_aulas concluídas)
        let lessonsQuery = supabase
          .from("conteudo_programatico_aulas")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "concluido");
        if (currentDisciplina) {
          lessonsQuery = lessonsQuery.eq("disciplina_id", currentDisciplina.id);
        }
        const { count: lessonCount } = await lessonsQuery;

        setStats({
          totalStudents: studentCount ?? 0,
          avgAttendance: avgAtt,
          avgGrade: avgGrade,
          totalLessons: lessonCount ?? 0,
          attendanceChange: presencas && presencas.length > 0 ? `${presencas.length} registros este mês` : "Sem dados",
          gradeChange: notas && notas.length > 0 ? `${notas.length} notas lançadas` : "Sem notas",
        });

        // 6. Recent activities
        const activities: RecentActivity[] = [];

        // Recent attendance
        const { data: recentPresencas } = await supabase
          .from("presencas")
          .select("data, status, student_id, students(nome)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3);

        if (recentPresencas) {
          for (const p of recentPresencas) {
            const studentName = (p as any).students?.nome ?? "Aluno";
            const statusMap: Record<string, string> = {
              presente: "Presente",
              ausente: "Ausente",
              atrasado: "Atrasado",
            };
            activities.push({
              type: "attendance",
              student: studentName,
              action: `Marcado como ${statusMap[p.status] ?? p.status} em ${format(new Date(p.data), "dd/MM")}`,
              time: p.data,
            });
          }
        }

        // Recent grades
        const { data: recentNotas } = await supabase
          .from("notas")
          .select("valor, nome_avaliacao, student_id, students(nome)")
          .eq("user_id", user.id)
          .not("valor", "is", null)
          .order("updated_at", { ascending: false })
          .limit(3);

        if (recentNotas) {
          for (const n of recentNotas) {
            const studentName = (n as any).students?.nome ?? "Aluno";
            activities.push({
              type: "grade",
              student: studentName,
              action: `Nota ${n.valor} em ${n.nome_avaliacao}`,
              time: "",
            });
          }
        }

        // Recent notes/anotacoes
        const { data: recentAnotacoes } = await supabase
          .from("anotacoes")
          .select("titulo, student_id, students(nome), created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(2);

        if (recentAnotacoes) {
          for (const a of recentAnotacoes) {
            const studentName = (a as any).students?.nome ?? "Aluno";
            activities.push({
              type: "note",
              student: studentName,
              action: `Anotação: ${a.titulo}`,
              time: "",
            });
          }
        }

        setRecentActivities(activities.slice(0, 6));
      } catch (err) {
        console.error("Dashboard data error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [user?.id, today, monthStart, monthEnd]);

  return { stats, recentActivities, activeDisciplina, loading };
};
