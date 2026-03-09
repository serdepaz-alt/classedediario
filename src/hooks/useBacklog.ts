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
  quadro: string;
  lido: boolean;
  created_at: string;
  updated_at: string;
  anotacao_titulo?: string;
  anotacao_tipo?: string;
  student_nome?: string;
  student_email?: string;
  turma_nome?: string;
}

export type QuadroType = "presenca" | "notas" | "anotacoes";

export const useBacklog = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("backlog_anotacoes")
      .select("*, anotacoes!backlog_anotacoes_anotacao_id_fkey(titulo, tipo, student_id, turma_id, students!anotacoes_student_id_fkey(nome, email), turmas!anotacoes_turma_id_fkey(nome))")
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
        student_email: item.anotacoes?.students?.email || null,
        turma_nome: item.anotacoes?.turmas?.nome || null,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchItems();

    const channel = supabase
      .channel("backlog-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "backlog_anotacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const quadroLabels: Record<string, string> = {
            presenca: "Presença",
            notas: "Notas",
            anotacoes: "Anotações",
          };
          const q = (payload.new as any).quadro || "anotacoes";
          toast.info(`📋 Nova tarefa — ${quadroLabels[q] || "Backlog"}`, {
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

  const getItemsByQuadro = (quadro: QuadroType) => items.filter(i => i.quadro === quadro);

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

  return { items, loading, unreadCount, pendingCount, getItemsByQuadro, fetchItems, markAsRead, markAllAsRead, updateStatus };
};
