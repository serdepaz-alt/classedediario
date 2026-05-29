import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ConteudoProgramaticoDoc {
  id: string;
  user_id: string;
  disciplina_id: string | null;
  turma_id: string | null;
  nome_arquivo: string;
  tipo_arquivo: string;
  tamanho_bytes: number | null;
  storage_path: string;
  descricao: string | null;
  created_at: string | null;
}

export const useConteudoProgramaticoDocs = (turmaId?: string, disciplinaId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading, error } = useQuery({
    queryKey: ["conteudo-programatico-docs", user?.id, turmaId, disciplinaId],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("conteudo_programatico_docs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (turmaId) {
        query = query.eq("turma_id", turmaId);
      }
      if (disciplinaId) {
        query = query.eq("disciplina_id", disciplinaId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ConteudoProgramaticoDoc[];
    },
    enabled: !!user?.id,
  });

  const uploadDocumento = useMutation({
    mutationFn: async ({
      file,
      turmaId,
      disciplinaId,
      descricao,
    }: {
      file: File;
      turmaId?: string;
      disciplinaId?: string;
      descricao?: string;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Sanitiza o nome: remove acentos, troca espaços/chars inválidos por "_"
      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");

      // Upload para o storage (chave 100% ASCII-safe)
      const filePath = `${user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("conteudo-programatico")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Registrar no banco
      const { data, error } = await supabase
        .from("conteudo_programatico_docs")
        .insert({
          user_id: user.id,
          turma_id: turmaId || null,
          disciplina_id: disciplinaId || null,
          nome_arquivo: file.name,
          tipo_arquivo: file.type,
          tamanho_bytes: file.size,
          storage_path: filePath,
          descricao: descricao || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conteudo-programatico-docs"] });
      toast.success("Documento enviado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao enviar documento:", error);
      toast.error(error?.message || "Erro ao enviar documento");
    },
  });

  const deleteDocumento = useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      // Remover do storage
      const { error: storageError } = await supabase.storage
        .from("conteudo-programatico")
        .remove([storagePath]);

      if (storageError) {
        console.warn("Erro ao remover arquivo do storage:", storageError);
      }

      // Remover do banco
      const { error } = await supabase
        .from("conteudo_programatico_docs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conteudo-programatico-docs"] });
      toast.success("Documento removido!");
    },
    onError: (error) => {
      console.error("Erro ao remover documento:", error);
      toast.error("Erro ao remover documento");
    },
  });

  const getDownloadUrl = async (storagePath: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from("conteudo-programatico")
      .createSignedUrl(storagePath, 3600); // 1 hora de validade

    if (error) {
      console.error("Erro ao gerar URL:", error);
      return null;
    }
    return data.signedUrl;
  };

  return {
    documentos,
    isLoading,
    error,
    uploadDocumento,
    deleteDocumento,
    getDownloadUrl,
  };
};
