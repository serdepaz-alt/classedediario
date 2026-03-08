import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TabelaValorHora {
  id: string;
  user_id: string;
  categoria: string;
  turno: string;
  valor_hora: number;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ValorEstagio {
  id: string;
  user_id: string;
  unidade_hospitalar: string;
  valor_base: number;
  dias_padrao: number;
  valor_vt: number;
  valor_va: number;
  custo_total_calculado: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  user_id: string;
  usuario_responsavel: string;
  acao: string;
  tabela_afetada: string;
  registro_id: string | null;
  valor_anterior: any;
  valor_novo: any;
  created_at: string;
}

export interface FolhaFechamento {
  id: string;
  user_id: string;
  mes_referencia: string;
  status: string;
  fechada_por: string | null;
  fechada_em: string | null;
  observacoes: string | null;
  created_at: string;
}

export const usePayroll = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Tabela Valores Hora
  const { data: valoresHora = [], isLoading: loadingValores } = useQuery({
    queryKey: ["tabela-valores-hora", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tabela_valores_hora")
        .select("*")
        .eq("user_id", user!.id)
        .order("categoria", { ascending: true });
      if (error) throw error;
      return data as TabelaValorHora[];
    },
    enabled: !!user?.id,
  });

  // Valores Estágio
  const { data: valoresEstagio = [], isLoading: loadingEstagios } = useQuery({
    queryKey: ["valores-estagio", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("valores_estagio")
        .select("*")
        .eq("user_id", user!.id)
        .order("unidade_hospitalar", { ascending: true });
      if (error) throw error;
      return data as ValorEstagio[];
    },
    enabled: !!user?.id,
  });

  // Audit Trail
  const { data: auditTrail = [], isLoading: loadingAudit } = useQuery({
    queryKey: ["audit-trail", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_trail")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as AuditEntry[];
    },
    enabled: !!user?.id,
  });

  // Folha Fechamento
  const { data: folhas = [], isLoading: loadingFolhas } = useQuery({
    queryKey: ["folha-fechamento", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folha_fechamento")
        .select("*")
        .eq("user_id", user!.id)
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data as FolhaFechamento[];
    },
    enabled: !!user?.id,
  });

  // Helpers
  const logAudit = async (acao: string, tabela: string, registroId: string | null, anterior: any, novo: any) => {
    if (!user?.id) return;
    await supabase.from("audit_trail").insert({
      user_id: user.id,
      usuario_responsavel: user.email || "Sistema",
      acao,
      tabela_afetada: tabela,
      registro_id: registroId,
      valor_anterior: anterior,
      valor_novo: novo,
    });
    queryClient.invalidateQueries({ queryKey: ["audit-trail"] });
  };

  // CRUD Valores Hora
  const addValorHora = useMutation({
    mutationFn: async (val: Omit<TabelaValorHora, "id" | "user_id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("tabela_valores_hora")
        .insert({ ...val, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      await logAudit("Criou valor hora-aula", "tabela_valores_hora", data.id, null, val);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabela-valores-hora"] });
      toast.success("Valor adicionado com sucesso");
    },
    onError: () => toast.error("Erro ao adicionar valor"),
  });

  const updateValorHora = useMutation({
    mutationFn: async ({ id, anterior, ...val }: Partial<TabelaValorHora> & { id: string; anterior: any }) => {
      const { data, error } = await supabase
        .from("tabela_valores_hora")
        .update({ ...val, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logAudit("Atualizou valor hora-aula", "tabela_valores_hora", id, anterior, val);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabela-valores-hora"] });
      toast.success("Valor atualizado");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteValorHora = useMutation({
    mutationFn: async ({ id, anterior }: { id: string; anterior: any }) => {
      const { error } = await supabase.from("tabela_valores_hora").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Removeu valor hora-aula", "tabela_valores_hora", id, anterior, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabela-valores-hora"] });
      toast.success("Valor removido");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  // Bulk update
  const bulkUpdateValores = useMutation({
    mutationFn: async (updates: { ids: string[]; campo: string; valor: number }) => {
      for (const id of updates.ids) {
        const item = valoresHora.find((v) => v.id === id);
        await supabase
          .from("tabela_valores_hora")
          .update({ [updates.campo]: updates.valor, updated_at: new Date().toISOString() })
          .eq("id", id);
        await logAudit(
          `Atualização em massa: ${updates.campo}`,
          "tabela_valores_hora",
          id,
          { [updates.campo]: item?.[updates.campo as keyof TabelaValorHora] },
          { [updates.campo]: updates.valor }
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tabela-valores-hora"] });
      toast.success("Atualização em massa concluída");
    },
    onError: () => toast.error("Erro na atualização em massa"),
  });

  // CRUD Estágio
  const addValorEstagio = useMutation({
    mutationFn: async (val: Omit<ValorEstagio, "id" | "user_id" | "created_at" | "updated_at" | "custo_total_calculado">) => {
      const custoTotal = val.valor_base + (val.dias_padrao * val.valor_vt) + (val.dias_padrao * val.valor_va);
      const { data, error } = await supabase
        .from("valores_estagio")
        .insert({ ...val, custo_total_calculado: custoTotal, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      await logAudit("Criou valor estágio", "valores_estagio", data.id, null, { ...val, custo_total_calculado: custoTotal });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valores-estagio"] });
      toast.success("Estágio adicionado");
    },
    onError: () => toast.error("Erro ao adicionar estágio"),
  });

  const deleteValorEstagio = useMutation({
    mutationFn: async ({ id, anterior }: { id: string; anterior: any }) => {
      const { error } = await supabase.from("valores_estagio").delete().eq("id", id);
      if (error) throw error;
      await logAudit("Removeu valor estágio", "valores_estagio", id, anterior, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valores-estagio"] });
      toast.success("Estágio removido");
    },
    onError: () => toast.error("Erro ao remover estágio"),
  });

  // Fechamento
  const fecharFolha = useMutation({
    mutationFn: async (mesRef: string) => {
      const { data, error } = await supabase
        .from("folha_fechamento")
        .insert({
          user_id: user!.id,
          mes_referencia: mesRef,
          status: "fechada",
          fechada_por: user!.email || "Direção",
          fechada_em: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      await logAudit("Fechou folha do mês", "folha_fechamento", data.id, null, { mes_referencia: mesRef, status: "fechada" });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["folha-fechamento"] });
      toast.success("Folha fechada com sucesso");
    },
    onError: () => toast.error("Erro ao fechar folha"),
  });

  return {
    valoresHora,
    valoresEstagio,
    auditTrail,
    folhas,
    isLoading: loadingValores || loadingEstagios || loadingAudit || loadingFolhas,
    addValorHora,
    updateValorHora,
    deleteValorHora,
    bulkUpdateValores,
    addValorEstagio,
    deleteValorEstagio,
    fecharFolha,
    logAudit,
  };
};
