import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Phone, Mail, MapPin, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const studentSchema = z.object({
  turma_id: z.string().min(1, "Seleção de turma obrigatória"),
  matricula: z.string().min(1, "Matrícula obrigatória"),
  nome: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
  data_nascimento: z.date().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  titulo_eleitoral: z.string().optional(),
  local_nascimento: z.string().optional(),
  estado_nascimento: z.string().optional(),
  nome_pai: z.string().optional(),
  nome_mae: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  data_matricula: z.date(),
  status: z.enum(["Ativo", "Inativo"]).default("Ativo"),
});

type StudentFormData = z.infer<typeof studentSchema>;

export interface StudentData {
  id: string;
  matricula: string;
  nome: string;
  turma_id?: string | null;
  data_nascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  titulo_eleitoral?: string | null;
  local_nascimento?: string | null;
  estado_nascimento?: string | null;
  nome_pai?: string | null;
  nome_mae?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  data_matricula: string;
  status?: string | null;
}

interface IndividualStudentFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  student?: StudentData | null;
}

export const IndividualStudentForm = ({ onCancel, onSuccess, student }: IndividualStudentFormProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!student;

  // Fetch turmas for selection
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso, periodo")
        .eq("user_id", user.id)
        .eq("status", "Ativa")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      matricula: student?.matricula || "",
      nome: student?.nome || "",
      turma_id: student?.turma_id || "",
      cpf: student?.cpf || "",
      rg: student?.rg || "",
      titulo_eleitoral: student?.titulo_eleitoral || "",
      local_nascimento: student?.local_nascimento || "",
      estado_nascimento: student?.estado_nascimento || "",
      nome_pai: student?.nome_pai || "",
      nome_mae: student?.nome_mae || "",
      telefone: student?.telefone || "",
      email: student?.email || "",
      endereco: student?.endereco || "",
      data_nascimento: student?.data_nascimento ? new Date(student.data_nascimento) : undefined,
      data_matricula: student?.data_matricula ? new Date(student.data_matricula) : new Date(),
      status: (student?.status as "Ativo" | "Inativo") || "Ativo",
    },
  });

  const onSubmit = async (data: StudentFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsLoading(true);
    try {
      const studentData = {
        matricula: data.matricula,
        nome: data.nome,
        turma_id: data.turma_id || null,
        data_nascimento: data.data_nascimento ? format(data.data_nascimento, "yyyy-MM-dd") : null,
        cpf: data.cpf || null,
        rg: data.rg || null,
        titulo_eleitoral: data.titulo_eleitoral || null,
        local_nascimento: data.local_nascimento || null,
        estado_nascimento: data.estado_nascimento || null,
        nome_pai: data.nome_pai || null,
        nome_mae: data.nome_mae || null,
        telefone: data.telefone || null,
        email: data.email || null,
        endereco: data.endereco || null,
        data_matricula: format(data.data_matricula, "yyyy-MM-dd"),
        status: data.status,
      };

      if (isEditing && student) {
        const { error } = await supabase
          .from("students")
          .update(studentData)
          .eq("id", student.id);
        if (error) throw error;
        toast.success("Estudante atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("students").insert({
          ...studentData,
          user_id: user.id,
        });
        if (error) throw error;
        toast.success("Estudante adicionado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving student:", error);
      toast.error(error.message || "Erro ao salvar estudante");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Dados Pessoais */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Dados Pessoais
        </h3>

        {/* Seleção de Turma - Campo obrigatório logo abaixo do título */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Turma *
          </Label>
          <Select
            value={form.watch("turma_id")}
            onValueChange={(value) => form.setValue("turma_id", value)}
          >
            <SelectTrigger className={cn(
              form.formState.errors.turma_id && "border-destructive"
            )}>
              <SelectValue placeholder="Selecione a turma do estudante" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {turmas.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma turma cadastrada
                </div>
              ) : (
                turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome} {turma.curso ? `- ${turma.curso}` : ""} {turma.periodo ? `(${turma.periodo})` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {form.formState.errors.turma_id && (
            <p className="text-sm text-destructive">{form.formState.errors.turma_id.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="matricula">Número de Matrícula *</Label>
            <Input
              id="matricula"
              placeholder="Ex: 2024001"
              {...form.register("matricula")}
            />
            {form.formState.errors.matricula && (
              <p className="text-sm text-destructive">{form.formState.errors.matricula.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              placeholder="Nome do estudante"
              {...form.register("nome")}
            />
            {form.formState.errors.nome && (
              <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de Nascimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("data_nascimento") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("data_nascimento") ? (
                    format(form.watch("data_nascimento")!, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("data_nascimento")}
                  onSelect={(date) => form.setValue("data_nascimento", date)}
                  initialFocus
                  locale={ptBR}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              {...form.register("cpf")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rg">Identidade (RG)</Label>
            <Input
              id="rg"
              placeholder="00.000.000-0"
              {...form.register("rg")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo_eleitoral">Título Eleitoral</Label>
            <Input
              id="titulo_eleitoral"
              placeholder="0000 0000 0000"
              {...form.register("titulo_eleitoral")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="local_nascimento">Local de Nascimento</Label>
            <Input
              id="local_nascimento"
              placeholder="Cidade"
              {...form.register("local_nascimento")}
            />
          </div>

          <div className="space-y-2">
            <Label>Estado de Nascimento</Label>
            <Select
              value={form.watch("estado_nascimento")}
              onValueChange={(value) => form.setValue("estado_nascimento", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {ESTADOS_BR.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filiação */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Filiação
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome_pai">Nome do Pai</Label>
            <Input
              id="nome_pai"
              placeholder="Nome completo"
              {...form.register("nome_pai")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_mae">Nome da Mãe</Label>
            <Input
              id="nome_mae"
              placeholder="Nome completo"
              {...form.register("nome_mae")}
            />
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Contato
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                className="pl-10"
                {...form.register("telefone")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                className="pl-10"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endereco">Endereço</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="endereco"
              placeholder="Rua, número, bairro, cidade"
              className="pl-10"
              {...form.register("endereco")}
            />
          </div>
        </div>
      </div>

      {/* Matrícula */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Matrícula
        </h3>
        
        <div className="space-y-2">
          <Label>Data de Matrícula *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch("data_matricula") && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("data_matricula") ? (
                  format(form.watch("data_matricula"), "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  "Selecione a data"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={form.watch("data_matricula")}
                onSelect={(date) => date && form.setValue("data_matricula", date)}
                initialFocus
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {isEditing && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label>Status do Estudante</Label>
              <p className="text-xs text-muted-foreground">
                {form.watch("status") === "Ativo"
                  ? "Aparece no lançamento de notas e na chamada"
                  : "Não aparece no lançamento de notas nem na chamada"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", form.watch("status") === "Ativo" ? "text-success" : "text-muted-foreground")}>
                {form.watch("status") === "Ativo" ? "Ativo" : "Inativo"}
              </span>
              <Switch
                checked={form.watch("status") === "Ativo"}
                onCheckedChange={(checked) => form.setValue("status", checked ? "Ativo" : "Inativo")}
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : isEditing ? "Atualizar Estudante" : "Salvar Estudante"}
        </Button>
      </div>
    </form>
  );
};
