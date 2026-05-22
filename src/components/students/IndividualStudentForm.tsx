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
import { CalendarIcon, Phone, Mail, MapPin, GraduationCap, Printer } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

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

  const handlePrintFicha = () => {
    const v = form.getValues();
    const turma = turmas.find((t) => t.id === v.turma_id);
    const fmt = (d?: Date) => (d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "");
    const dataNasc = v.data_nascimento ? fmt(v.data_nascimento) : "";
    const dataMat = v.data_matricula ? fmt(v.data_matricula) : "";
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const logoUrl = `${window.location.origin}/logo-irma-dulce.jpeg`;
    const cursoNome = (turma as any)?.curso || "";
    const turmaNome = (turma as any)?.nome || "";
    const turno = (turma as any)?.periodo || "";
    const horario = (turma as any)?.horario || "";

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Ficha de Matrícula - ${v.nome}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color:#000; margin:0; font-size:12pt; }
  .header { text-align:center; margin-bottom:10px; }
  .header img { width:110px; height:110px; object-fit:contain; display:block; margin:0 auto 6px; }
  .header h1 { font-size:14pt; margin:0; font-weight:bold; }
  .title { text-align:center; font-size:13pt; font-weight:bold; margin:14px 0 8px; text-decoration:underline; }
  table { width:100%; border-collapse:collapse; margin-bottom:8px; }
  td, th { border:1px solid #000; padding:5px 7px; vertical-align:top; text-align:left; font-size:11pt; }
  th { background:#eee; }
  .section { font-weight:bold; background:#ddd; padding:4px 7px; border:1px solid #000; border-bottom:none; font-size:11pt; }
  .declaracao { border:1px solid #000; padding:10px; font-size:11pt; text-align:justify; margin-top:8px; line-height:1.5; }
  .assinaturas { margin-top:50px; display:flex; justify-content:space-between; gap:40px; }
  .assinatura { flex:1; text-align:center; border-top:1px solid #000; padding-top:5px; font-size:11pt; }
  .local-data { margin-top:24px; font-size:11pt; }
  @media print { .no-print { display:none; } }
  .actions { text-align:center; padding:12px; }
  .actions button { padding:8px 18px; font-size:13px; cursor:pointer; }
</style></head><body>
<div class="actions no-print">
  <button onclick="window.print()">Imprimir</button>
  <button onclick="window.close()">Fechar</button>
</div>
<div class="header">
  <img src="${logoUrl}" alt="Logo"/>
  <h1>Centro de Formação Técnica em Enfermagem Irmã Dulce</h1>
</div>
<div class="title">Ficha de Matrícula</div>

<table><tr>
  <th style="width:60%">Curso: ${cursoNome}</th>
  <th>Matrícula: ${v.matricula || ""}</th>
</tr></table>

<div class="section">Dados de Identificação do Aluno</div>
<table>
  <tr><td colspan="3">Nome: ${v.nome || ""}</td></tr>
  <tr>
    <td style="width:50%">Data de Nascimento: ${dataNasc}</td>
    <td colspan="2">Naturalidade: ${v.local_nascimento || ""}${v.estado_nascimento ? " / " + v.estado_nascimento : ""}</td>
  </tr>
  <tr><td colspan="3">Endereço Residencial: ${v.endereco || ""}</td></tr>
  <tr>
    <td>Bairro: </td>
    <td>CEP: </td>
    <td>Telefone: ${v.telefone || ""}</td>
  </tr>
  <tr>
    <td>Município: ${v.local_nascimento || ""}</td>
    <td colspan="2">UF: ${v.estado_nascimento || ""}</td>
  </tr>
  <tr>
    <td>CPF: ${v.cpf || ""}</td>
    <td>Identidade: ${v.rg || ""}</td>
    <td>Título: ${v.titulo_eleitoral || ""}</td>
  </tr>
  <tr><td colspan="3">Estabelecimento em que estudou anteriormente: </td></tr>
  <tr><td colspan="3">Endereço do Estabelecimento: </td></tr>
  <tr><td colspan="3">Formação: Geral</td></tr>
</table>

<div class="section">Filiação</div>
<table>
  <tr><td>Nome do Pai: ${v.nome_pai || ""}</td></tr>
  <tr><td>Nome da Mãe: ${v.nome_mae || ""}</td></tr>
</table>

<div class="section">Dados Funcionais do Aluno</div>
<table>
  <tr>
    <td style="width:50%">Empresa: </td>
    <td>Tempo de serviço: </td>
  </tr>
  <tr><td colspan="2">Função: </td></tr>
  <tr><td colspan="2">Endereço Comercial: </td></tr>
  <tr>
    <td>Município: </td>
    <td>Estado: / Telefone: </td>
  </tr>
  <tr><td colspan="2">Telefone de referência: ${v.telefone || ""}</td></tr>
</table>

<div class="section">Declaração</div>
<div class="declaracao">
  Vem requerer matrícula regular nesta Unidade de Ensino, no turno <b>${turno}</b> ${horario ? horario : ""}, na turma <b>${turmaNome}</b>, curso de <b>${cursoNome}</b>, declarando estar ciente do estágio para o efeito de conclusão do curso.
</div>

<div class="local-data">Salvador, ${hoje}.</div>

<div class="assinaturas">
  <div class="assinatura">Assinatura do Aluno</div>
  <div class="assinatura">Assinatura do Funcionário</div>
</div>

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a ficha");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

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
                  captionLayout="dropdown-buttons"
                  fromYear={1940}
                  toYear={new Date().getFullYear()}
                  defaultMonth={form.watch("data_nascimento") || new Date(2005, 0, 1)}
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
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {isEditing && (
          <Button type="button" variant="secondary" onClick={handlePrintFicha} className="mr-auto">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Ficha de Matrícula
          </Button>
        )}
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
