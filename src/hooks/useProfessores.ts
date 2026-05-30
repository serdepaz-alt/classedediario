import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Professor {
  id: string;
  user_id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  telefone2: string | null;
  valor_hora: number;
  especialidade: string | null;
  status: string | null;
  rg: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  estado_civil: string | null;
  profissao: string | null;
  endereco_rua: string | null;
  endereco_numero: string | null;
  endereco_bairro: string | null;
  endereco_cep: string | null;
  formacao: string | null;
  indicacao: string | null;
  funcao: string | null;
  experiencia: string | null;
  coren: string | null;
  disciplinas_lecionar: string | null;
  turnos_disponiveis: string | null;
  senha: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const gerarSenha = (nome: string, dataNascimento?: string): string => {
  const primeiroNome = nome.trim().split(" ")[0];
  const ano = dataNascimento ? new Date(dataNascimento + "T12:00:00").getFullYear() : "";
  return `${primeiroNome}${ano}`;
};

export interface ProfessorFormData {
  nome: string;
  email?: string;
  telefone?: string;
  telefone2?: string;
  valor_hora: number;
  especialidade?: string;
  status?: string;
  rg?: string;
  cpf?: string;
  data_nascimento?: string;
  endereco?: string;
  estado_civil?: string;
  profissao?: string;
  endereco_rua?: string;
  endereco_numero?: string;
  endereco_bairro?: string;
  endereco_cep?: string;
  formacao?: string;
  indicacao?: string;
  funcao?: string;
  experiencia?: string;
  coren?: string;
  disciplinas_lecionar?: string;
  turnos_disponiveis?: string;
  senha?: string;
}

export const useProfessores = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: professores = [], isLoading, error } = useQuery({
    queryKey: ["professores", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("cad_professores")
        .select("*")
        .eq("user_id", user.id)
        .order("nome", { ascending: true });

      if (error) throw error;
      return data as Professor[];
    },
    enabled: !!user?.id,
  });

  const createProfessor = useMutation({
    mutationFn: async (formData: ProfessorFormData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("cad_professores")
        .insert({
          user_id: user.id,
          nome: formData.nome,
          email: formData.email || null,
          telefone: formData.telefone || null,
          telefone2: formData.telefone2 || null,
          valor_hora: formData.valor_hora || 50,
          especialidade: formData.especialidade || null,
          status: formData.status || "Ativo",
          rg: formData.rg || null,
          cpf: formData.cpf || null,
          data_nascimento: formData.data_nascimento || null,
          endereco: formData.endereco || null,
          estado_civil: formData.estado_civil || null,
          profissao: formData.profissao || null,
          endereco_rua: formData.endereco_rua || null,
          endereco_numero: formData.endereco_numero || null,
          endereco_bairro: formData.endereco_bairro || null,
          endereco_cep: formData.endereco_cep || null,
          formacao: formData.formacao || null,
          indicacao: formData.indicacao || null,
          funcao: formData.funcao || null,
          experiencia: formData.experiencia || null,
          coren: formData.coren || null,
          disciplinas_lecionar: formData.disciplinas_lecionar || null,
          turnos_disponiveis: formData.turnos_disponiveis || null,
          senha: formData.senha || gerarSenha(formData.nome, formData.data_nascimento),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor cadastrado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao cadastrar professor:", error);
      toast.error("Erro ao cadastrar professor");
    },
  });

  const updateProfessor = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ProfessorFormData }) => {
      const { data, error } = await supabase
        .from("cad_professores")
        .update({
          nome: formData.nome,
          email: formData.email || null,
          telefone: formData.telefone || null,
          telefone2: formData.telefone2 || null,
          valor_hora: formData.valor_hora || 50,
          especialidade: formData.especialidade || null,
          status: formData.status,
          rg: formData.rg || null,
          cpf: formData.cpf || null,
          data_nascimento: formData.data_nascimento || null,
          endereco: formData.endereco || null,
          estado_civil: formData.estado_civil || null,
          profissao: formData.profissao || null,
          endereco_rua: formData.endereco_rua || null,
          endereco_numero: formData.endereco_numero || null,
          endereco_bairro: formData.endereco_bairro || null,
          endereco_cep: formData.endereco_cep || null,
          formacao: formData.formacao || null,
          indicacao: formData.indicacao || null,
          funcao: formData.funcao || null,
          experiencia: formData.experiencia || null,
          coren: formData.coren || null,
          disciplinas_lecionar: formData.disciplinas_lecionar || null,
          turnos_disponiveis: formData.turnos_disponiveis || null,
          senha: formData.senha || gerarSenha(formData.nome, formData.data_nascimento),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar professor:", error);
      toast.error("Erro ao atualizar professor");
    },
  });

  const deleteProfessor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cad_professores")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["professores"] });
      toast.success("Professor removido com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao remover professor:", error);
      toast.error("Erro ao remover professor");
    },
  });

  return {
    professores,
    isLoading,
    error,
    createProfessor,
    updateProfessor,
    deleteProfessor,
  };
};
