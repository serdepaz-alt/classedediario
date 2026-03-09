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
  status_acompanhamento: string;
  observacao_admin: string | null;
  created_at: string;
  updated_at: string;
  // joined
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
  status_acompanhamento?: string;
}

export const useNotes = () => {
  const { user } = useAuth();
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [students, setStudents] = useState<{ id: string; nome: string; turma_id: string | null; turma_nome?: string }[]>([]);
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
      const mapped = (data || []).map((a: any) => ({
        ...a,
        student_nome: a.students?.nome || "Aluno",
        turma_nome: a.turmas?.nome || null,
      }));
      setAnotacoes(mapped);
    }
    setLoading(false);
  }, [user]);

  const fetchStudents = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("students")
      .select("id, nome, turma_id, turmas(nome)")
      .eq("user_id", user.id)
      .eq("status", "Ativo")
      .order("nome");

    if (data) {
      setStudents(data.map((s: any) => ({
        id: s.id,
        nome: s.nome,
        turma_id: s.turma_id,
        turma_nome: s.turmas?.nome || null,
      })));
    }
  }, [user]);

  useEffect(() => {
    fetchAnotacoes();
    fetchStudents();
  }, [fetchAnotacoes, fetchStudents]);

  const createAnotacao = async (form: AnotacaoForm) => {
    if (!user) return;
    const { error } = await supabase.from("anotacoes").insert({
      user_id: user.id,
      student_id: form.student_id,
      turma_id: form.turma_id || null,
      titulo: form.titulo,
      conteudo: form.conteudo,
      tipo: form.tipo,
      prioridade: form.prioridade,
      disciplina: form.disciplina || null,
      status_acompanhamento: form.status_acompanhamento || "pendente",
    });
    if (error) {
      toast.error("Erro ao salvar anotação");
      console.error(error);
    } else {
      toast.success("Anotação salva com sucesso!");
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

  return { anotacoes, students, loading, createAnotacao, updateAnotacao, deleteAnotacao, refetch: fetchAnotacoes };
};
