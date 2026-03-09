import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Anotacao {
  id: string;
  user_id: string;
  student_id: string;
  turma_id: string | null;
  titulo: string;
  conteudo: string;
  tipo: string;
  prioridade: string;
  disciplina: string | null;
  professor_nome: string | null;
  status_acompanhamento: string;
  observacao_admin: string | null;
  created_at: string;
  updated_at: string;
  student_nome?: string;
  turma_nome?: string;
}

export interface AnotacaoForm {
  student_id: string;
  turma_id?: string | null;
  titulo: string;
  conteudo: string;
  tipo: string;
  prioridade: string;
  disciplina?: string;
  professor_nome?: string;
  status_acompanhamento?: string;
}

export interface ProfessorLogado {
  id: string;
  nome: string;
  disciplinas_lecionar: string[];
  turma_ids: string[];
  disciplina_atual: string | null;
  turma_atual_id: string | null;
}

export const useNotes = () => {
  const { user } = useAuth();
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: string; nome: string; turma_id: string | null; turma_nome?: string }[]>([]);
  const [professorLogado, setProfessorLogado] = useState<ProfessorLogado | null>(null);
  const [professores, setProfessores] = useState<{ id: string; nome: string; disciplinas_lecionar: string | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAnotacoes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("anotacoes")
      .select("*, students!anotacoes_student_id_fkey(nome), turmas!anotacoes_turma_id_fkey(nome)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar anotações:", error);
      toast.error("Erro ao carregar anotações");
    } else {
      setAnotacoes((data || []).map((a: any) => ({
        ...a,
        student_nome: a.students?.nome || "Aluno",
        turma_nome: a.turmas?.nome || null,
      })));
    }
    setLoading(false);
  }, [user]);

  const fetchSupport = useCallback(async () => {
    if (!user) return;

    // All active students
    const { data: sts } = await supabase
      .from("students")
      .select("id, nome, turma_id, turmas(nome)")
      .eq("user_id", user.id)
      .eq("status", "Ativo")
      .order("nome");
    if (sts) {
      setAllStudents(sts.map((s: any) => ({ id: s.id, nome: s.nome, turma_id: s.turma_id, turma_nome: s.turmas?.nome || null })));
    }

    // All professors
    const { data: profs } = await supabase
      .from("cad_professores")
      .select("id, nome, email, disciplinas_lecionar")
      .eq("user_id", user.id)
      .eq("status", "Ativo")
      .order("nome");
    if (profs) setProfessores(profs);

    // Detect logged-in professor by email
    if (user.email && profs) {
      const me = profs.find(p => p.email === user.email);
      if (me) {
        // Parse disciplinas_lecionar (comma-separated or JSON array)
        let discs: string[] = [];
        if (me.disciplinas_lecionar) {
          try {
            const parsed = JSON.parse(me.disciplinas_lecionar);
            discs = Array.isArray(parsed) ? parsed : [me.disciplinas_lecionar];
          } catch {
            discs = me.disciplinas_lecionar.split(",").map(d => d.trim()).filter(Boolean);
          }
        }

        // Get turma_ids from cronograma where this professor teaches
        const { data: aulas } = await supabase
          .from("cronograma_mestre")
          .select("turma_id, disciplina_id, data_aula, hora_inicio, hora_fim, cad_disciplinas!cronograma_mestre_disciplina_id_fkey(nome)")
          .eq("user_id", user.id)
          .eq("professor_id", me.id)
          .not("turma_id", "is", null);

        const turmaIds = [...new Set((aulas || []).map(a => a.turma_id).filter(Boolean))] as string[];

        // Detect current discipline (today's date, current time)
        const hoje = new Date().toISOString().split("T")[0];
        const agora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
        let disciplinaAtual: string | null = null;
        let turmaAtualId: string | null = null;

        // 1) Try cronograma with disciplina_id set
        const aulasComDisc = (aulas || []).filter((a: any) => a.disciplina_id);
        const aulaHoje = aulasComDisc.find((a: any) =>
          a.data_aula === hoje && a.hora_inicio <= agora && a.hora_fim >= agora
        );
        if (aulaHoje) {
          disciplinaAtual = (aulaHoje as any).cad_disciplinas?.nome || null;
          turmaAtualId = aulaHoje.turma_id;
        } else {
          const proxima = aulasComDisc
            .filter((a: any) => a.data_aula === hoje && a.hora_inicio >= agora)
            .sort((a: any, b: any) => a.hora_inicio.localeCompare(b.hora_inicio))[0];
          if (proxima) {
            disciplinaAtual = (proxima as any).cad_disciplinas?.nome || null;
            turmaAtualId = proxima.turma_id;
          }
        }

        // 2) Fallback: find active discipline from `disciplinas` table by date range + turma
        if (!disciplinaAtual && turmaIds.length > 0) {
          const { data: discAtivas } = await supabase
            .from("disciplinas")
            .select("nome, turma_id")
            .eq("user_id", user.id)
            .in("turma_id", turmaIds)
            .lte("data_inicio", hoje)
            .gte("data_termino", hoje)
            .limit(1);

          if (discAtivas && discAtivas.length > 0) {
            disciplinaAtual = discAtivas[0].nome;
            turmaAtualId = discAtivas[0].turma_id;
          }
        }

        // 3) Fallback: today's cronograma entry turma → any active discipline for that turma
        if (!disciplinaAtual) {
          const aulaHojeSemDisc = (aulas || []).find((a: any) =>
            a.data_aula === hoje || (a.data_aula >= hoje)
          );
          if (aulaHojeSemDisc?.turma_id) {
            const { data: discTurma } = await supabase
              .from("disciplinas")
              .select("nome, turma_id")
              .eq("user_id", user.id)
              .eq("turma_id", aulaHojeSemDisc.turma_id)
              .lte("data_inicio", hoje)
              .gte("data_termino", hoje)
              .limit(1);

            if (discTurma && discTurma.length > 0) {
              disciplinaAtual = discTurma[0].nome;
              turmaAtualId = discTurma[0].turma_id;
            }
          }
        }

        setProfessorLogado({
          id: me.id,
          nome: me.nome,
          disciplinas_lecionar: discs,
          turma_ids: turmaIds,
          disciplina_atual: disciplinaAtual,
          turma_atual_id: turmaAtualId,
        });
      }
    }
  }, [user]);

  useEffect(() => {
    fetchAnotacoes();
    fetchSupport();
  }, [fetchAnotacoes, fetchSupport]);

  const createAnotacao = async (form: AnotacaoForm) => {
    if (!user) return;
    const { data, error } = await supabase.from("anotacoes").insert({
      user_id: user.id,
      student_id: form.student_id,
      turma_id: form.turma_id || null,
      titulo: form.titulo,
      conteudo: form.conteudo,
      tipo: form.tipo,
      prioridade: form.prioridade,
      disciplina: form.disciplina || null,
      professor_nome: form.professor_nome || null,
      status_acompanhamento: form.status_acompanhamento || "pendente",
    }).select("id").single();
    if (error) {
      toast.error("Erro ao salvar anotação");
      console.error(error);
    } else {
      toast.success("Anotação salva com sucesso!");
      // Create backlog items for professor + admin
      if (data?.id) {
        const backlogItems = [
          {
            user_id: user.id,
            anotacao_id: data.id,
            responsavel_tipo: "admin",
            responsavel_nome: "Administrativo",
            titulo: `[Admin] ${form.titulo}`,
            descricao: form.conteudo,
            prioridade: form.prioridade,
            status: "pendente",
            lido: false,
          },
          {
            user_id: user.id,
            anotacao_id: data.id,
            responsavel_tipo: "professor",
            responsavel_nome: form.professor_nome || "Professor",
            titulo: `[Prof] ${form.titulo}`,
            descricao: form.conteudo,
            prioridade: form.prioridade,
            status: "pendente",
            lido: false,
          },
        ];
        await supabase.from("backlog_anotacoes").insert(backlogItems);
      }
      fetchAnotacoes();
    }
  };

  const updateAnotacao = async (id: string, updates: Partial<AnotacaoForm & { status_acompanhamento: string; observacao_admin: string }>) => {
    if (!user) return;
    const { error } = await supabase
      .from("anotacoes")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao atualizar anotação");
    } else {
      toast.success("Anotação atualizada!");
      fetchAnotacoes();
    }
  };

  const deleteAnotacao = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("anotacoes").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao excluir anotação");
    } else {
      toast.success("Anotação excluída");
      fetchAnotacoes();
    }
  };

  return { anotacoes, allStudents, professorLogado, professores, loading, createAnotacao, updateAnotacao, deleteAnotacao, refetch: fetchAnotacoes };
};
