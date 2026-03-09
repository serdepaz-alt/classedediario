import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ProfessorTurmaInfo {
  turma_id: string;
  turma_nome: string;
  disciplina_id: string;
  disciplina_nome: string;
}

interface StudentWithGrades {
  id: string;
  nome: string;
  matricula: string;
  grades: {
    id: string;
    numero_avaliacao: number;
    nome_avaliacao: string;
    peso: number;
    valor: number | null;
    is_locked: boolean;
    bonus: number | null;
    notificacao_status: string;
  }[];
}

export const useGrades = () => {
  const { user } = useAuth();
  const [professorId, setProfessorId] = useState<string | null>(null);
  const [professorNome, setProfessorNome] = useState<string | null>(null);
  const [turmasDisponiveis, setTurmasDisponiveis] = useState<ProfessorTurmaInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Find professor by email — scoped to user_id to avoid cross-user leakage
  useEffect(() => {
    if (!user?.email || !user?.id) return;

    const fetchProfessor = async () => {
      const { data } = await supabase
        .from("cad_professores")
        .select("id, nome")
        .eq("user_id", user.id)
        .eq("email", user.email!)
        .maybeSingle();

      if (data) {
        setProfessorId(data.id);
        setProfessorNome(data.nome);
      }
      setLoading(false);
    };

    fetchProfessor();
  }, [user?.email, user?.id]);

  // Fetch turmas where this professor has classes in cronograma
  // Fallback: also include disciplinas where nome_professor matches
  useEffect(() => {
    if (!user) return;

    const fetchTurmas = async () => {
      const uniqueMap = new Map<string, ProfessorTurmaInfo>();

      // Primary: from cronograma_mestre (when professorId is found)
      if (professorId) {
        const { data: aulas } = await supabase
          .from("cronograma_mestre")
          .select(`
            turma_id,
            disciplina_id,
            turmas!cronograma_mestre_turma_id_fkey(nome),
            cad_disciplinas!cronograma_mestre_disciplina_id_fkey(nome)
          `)
          .eq("user_id", user.id)
          .eq("professor_id", professorId);

        if (aulas) {
          for (const aula of aulas) {
            if (!aula.turma_id || !aula.disciplina_id) continue;
            const key = `${aula.turma_id}_${aula.disciplina_id}`;
            if (!uniqueMap.has(key)) {
              const turmaData = aula.turmas as any;
              const discData = aula.cad_disciplinas as any;
              uniqueMap.set(key, {
                turma_id: aula.turma_id,
                turma_nome: turmaData?.nome || "Turma",
                disciplina_id: aula.disciplina_id,
                disciplina_nome: discData?.nome || "Disciplina",
              });
            }
          }
        }
      }

      // Fallback: disciplinas table (works even without cronograma entries)
      // Fetches all disciplinas for this user — used when no cronograma match
      if (uniqueMap.size === 0) {
        const { data: discs } = await supabase
          .from("disciplinas")
          .select("id, nome, turma_id, turmas(nome)")
          .eq("user_id", user.id)
          .not("turma_id", "is", null);

        if (discs) {
          for (const disc of discs) {
            if (!disc.turma_id) continue;
            const key = `${disc.turma_id}_${disc.id}`;
            if (!uniqueMap.has(key)) {
              const turmaData = disc.turmas as any;
              uniqueMap.set(key, {
                turma_id: disc.turma_id,
                turma_nome: turmaData?.nome || "Turma",
                disciplina_id: disc.id,
                disciplina_nome: disc.nome,
              });
            }
          }
        }
      }

      setTurmasDisponiveis(Array.from(uniqueMap.values()));
    };

    fetchTurmas();
  }, [professorId, user]);

  // Fetch students for a turma
  const fetchStudents = useCallback(async (turmaId: string): Promise<{ id: string; nome: string; matricula: string }[]> => {
    const { data } = await supabase
      .from("students")
      .select("id, nome, matricula")
      .eq("turma_id", turmaId)
      .eq("status", "Ativo")
      .order("nome");

    return data || [];
  }, []);

  // Fetch grades for a student + disciplina
  const fetchStudentGrades = useCallback(async (studentId: string, disciplinaId: string) => {
    const { data } = await supabase
      .from("notas")
      .select("*")
      .eq("student_id", studentId)
      .eq("disciplina_id", disciplinaId)
      .order("numero_avaliacao");

    return data || [];
  }, []);

  // Fetch all grades for a disciplina (all students)
  const fetchAllGradesForDisciplina = useCallback(async (disciplinaId: string) => {
    const { data } = await supabase
      .from("notas")
      .select("*, students!notas_student_id_fkey(nome, matricula)")
      .eq("disciplina_id", disciplinaId)
      .order("numero_avaliacao");

    return data || [];
  }, []);

  // Save a grade
  const saveGrade = async (params: {
    studentId: string;
    disciplinaId: string;
    numeroAvaliacao: number;
    nomeAvaliacao: string;
    peso: number;
    valor: number | null;
    isLocked: boolean;
    bonus: number;
    existingId?: string;
  }) => {
    if (!user) return null;

    const payload = {
      user_id: user.id,
      student_id: params.studentId,
      disciplina_id: params.disciplinaId,
      numero_avaliacao: params.numeroAvaliacao,
      nome_avaliacao: params.nomeAvaliacao,
      peso: params.peso,
      valor: params.valor,
      is_locked: params.isLocked,
      bonus: params.bonus,
    };

    if (params.existingId) {
      const { data, error } = await supabase
        .from("notas")
        .update(payload)
        .eq("id", params.existingId)
        .select()
        .single();
      return { data, error };
    } else {
      const { data, error } = await supabase
        .from("notas")
        .insert(payload)
        .select()
        .single();
      return { data, error };
    }
  };

  return {
    professorId,
    professorNome,
    turmasDisponiveis,
    loading,
    fetchStudents,
    fetchStudentGrades,
    fetchAllGradesForDisciplina,
    saveGrade,
  };
};
