import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface BacklogItem {
  id: string;
  user_id: string;
  anotacao_id: string;
  responsavel_tipo: string;
  responsavel_nome: string | null;
  professor_id: string | null;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  lido: boolean;
  created_at: string;
  updated_at: string;
  // joined
  anotacao_titulo?: string;
  anotacao_tipo?: string;
  student_nome?: string;
  turma_nome?: string;
}

export const useBacklog = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("backlog_anotacoes")
      .select("*, anotacoes!backlog_anotacoes_anotacao_id_fkey(titulo, tipo, student_id, turma_id, students!anotacoes_student_id_fkey(nome), turmas!anotacoes_turma_id_fkey(nome))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar backlog:", error);
    } else {
      setItems((data || []).map((item: any) => ({
        ...item,
        anotacao_titulo: item.anotacoes?.titulo || "",
        anotacao_tipo: item.anotacoes?.tipo || "info",
        student_nome: item.anotacoes?.students?.nome || "Aluno",
        turma_nome: item.anotacoes?.turmas?.nome || null,
      })));
    }
    setLoading(false);
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    fetchItems();

    const channel = supabase
      .channel("backlog-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "backlog_anotacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          toast.info("📋 Nova tarefa no backlog!", {
            description: (payload.new as any).titulo,
            duration: 5000,
          });
          fetchItems();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, fetchItems]);

  const unreadCount = items.filter(i => !i.lido).length;
  const pendingCount = items.filter(i => i.status === "pendente").length;

  const markAsRead = async (id: string) => {
    if (!user) return;
    await supabase.from("backlog_anotacoes").update({ lido: true }).eq("id", id).eq("user_id", user.id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, lido: true } : i));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from("backlog_anotacoes").update({ lido: true }).eq("user_id", user.id).eq("lido", false);
    setItems(prev => prev.map(i => ({ ...i, lido: true })));
  };

  const updateStatus = async (id: string, status: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("backlog_anotacoes")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Status atualizado: ${status === "concluido" ? "Concluído" : status === "em_andamento" ? "Em andamento" : "Pendente"}`);
      fetchItems();
    }
  };

  const createBacklogItems = async (anotacaoId: string, titulo: string, descricao: string, prioridade: string, professorNome?: string) => {
    if (!user) return;
    const items = [
      // Item for admin
      {
        user_id: user.id,
        anotacao_id: anotacaoId,
        responsavel_tipo: "admin",
        responsavel_nome: "Administrativo",
        titulo: `[Admin] ${titulo}`,
        descricao,
        prioridade,
        status: "pendente",
        lido: false,
      },
      // Item for professor (author)
      {
        user_id: user.id,
        anotacao_id: anotacaoId,
        responsavel_tipo: "professor",
        responsavel_nome: professorNome || "Professor",
        titulo: `[Prof] ${titulo}`,
        descricao,
        prioridade,
        status: "pendente",
        lido: false,
      },
    ];
    const { error } = await supabase.from("backlog_anotacoes").insert(items);
    if (error) console.error("Erro ao criar backlog:", error);
  };

  return { items, loading, unreadCount, pendingCount, fetchItems, markAsRead, markAllAsRead, updateStatus, createBacklogItems };
};
