import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Professor, ProfessorFormData } from "@/hooks/useProfessores";
import { Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

const professorSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().max(20).optional().or(z.literal("")),
  telefone2: z.string().max(20).optional().or(z.literal("")),
  valor_hora: z.coerce.number().min(0).default(50),
  especialidade: z.string().max(100).optional().or(z.literal("")),
  status: z.string().optional(),
  rg: z.string().max(20).optional().or(z.literal("")),
  cpf: z.string().max(14).optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  endereco: z.string().max(200).optional().or(z.literal("")),
  formacao: z.string().max(200).optional().or(z.literal("")),
  indicacao: z.string().max(200).optional().or(z.literal("")),
  funcao: z.string().optional().or(z.literal("")),
  experiencia: z.string().max(500).optional().or(z.literal("")),
  coren: z.string().max(30).optional().or(z.literal("")),
  disciplinas_lecionar: z.string().optional().or(z.literal("")),
  turnos_disponiveis: z.string().optional().or(z.literal("")),
});

interface ProfessorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor?: Professor | null;
  onSubmit: (data: ProfessorFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const FUNCOES = [
  "Professor(a)",
  "Supervisor(a)",
  "Coordenador(a)",
  "Instrutor(a)",
];

const TURNOS = ["Matutino", "Vespertino", "Noturno", "Intermediário"];

const defaultValues: ProfessorFormData = {
  nome: "",
  email: "",
  telefone: "",
  telefone2: "",
  valor_hora: 50,
  especialidade: "",
  status: "Ativo",
  rg: "",
  cpf: "",
  data_nascimento: "",
  endereco: "",
  formacao: "",
  indicacao: "",
  funcao: "",
  experiencia: "",
  coren: "",
  disciplinas_lecionar: "",
  turnos_disponiveis: "",
};

export const ProfessorFormDialog = ({
  open,
  onOpenChange,
  professor,
  onSubmit,
  isSubmitting,
}: ProfessorFormDialogProps) => {
  const isEditing = !!professor;

  const form = useForm<ProfessorFormData>({
    resolver: zodResolver(professorSchema),
    defaultValues,
  });

  useEffect(() => {
    if (professor) {
      form.reset({
        nome: professor.nome,
        email: professor.email || "",
        telefone: professor.telefone || "",
        telefone2: professor.telefone2 || "",
        valor_hora: professor.valor_hora,
        especialidade: professor.especialidade || "",
        status: professor.status || "Ativo",
        rg: professor.rg || "",
        cpf: professor.cpf || "",
        data_nascimento: professor.data_nascimento || "",
        endereco: professor.endereco || "",
        formacao: professor.formacao || "",
        indicacao: professor.indicacao || "",
        funcao: professor.funcao || "",
        experiencia: professor.experiencia || "",
        coren: professor.coren || "",
        disciplinas_lecionar: professor.disciplinas_lecionar || "",
        turnos_disponiveis: professor.turnos_disponiveis || "",
      });
    } else {
      form.reset(defaultValues);
    }
  }, [professor, form]);

  const handleSubmit = async (data: ProfessorFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Professor" : "Novo Professor"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Professor/Supervisor *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* RG, CPF, Data de Nascimento */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Endereço */}
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Endereço completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Telefone 01, Telefone 02 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone 01</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone 02</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email, Coren */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coren"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coren</FormLabel>
                    <FormControl>
                      <Input placeholder="Número do Coren" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Formação */}
            <FormField
              control={form.control}
              name="formacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formação</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Enfermagem, Pedagogia..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Especialidade, Indicação */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="especialidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Especialidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: UTI, Centro Cirúrgico..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="indicacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indicação</FormLabel>
                    <FormControl>
                      <Input placeholder="Quem indicou" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Função, Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="funcao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Função</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FUNCOES.map((f) => (
                          <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "Ativo"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Ativo">Ativo</SelectItem>
                        <SelectItem value="Inativo">Inativo</SelectItem>
                        <SelectItem value="Afastado">Afastado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Experiência */}
            <FormField
              control={form.control}
              name="experiencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Experiência</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva a experiência profissional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Disciplinas que pretende lecionar, Turnos Disponíveis */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="disciplinas_lecionar"
                render={({ field }) => {
                  const selected = field.value ? field.value.split(", ").filter(Boolean) : [];
                  const toggleDisciplina = (nome: string) => {
                    const updated = selected.includes(nome)
                      ? selected.filter((s) => s !== nome)
                      : [...selected, nome];
                    field.onChange(updated.join(", "));
                  };
                  return (
                    <FormItem>
                      <FormLabel>Disciplinas que pretende lecionar</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between h-auto min-h-10 font-normal"
                            >
                              {selected.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {selected.map((s) => (
                                    <Badge key={s} variant="secondary" className="text-xs">
                                      {s}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Selecione...</span>
                              )}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-2 max-h-[250px] overflow-y-auto" align="start">
                          {disciplinasList.length === 0 ? (
                            <p className="text-sm text-muted-foreground p-2">Nenhum padrão cadastrado</p>
                          ) : (
                            disciplinasList.map((d) => (
                              <label
                                key={d}
                                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                              >
                                <Checkbox
                                  checked={selected.includes(d)}
                                  onCheckedChange={() => toggleDisciplina(d)}
                                />
                                {d}
                              </label>
                            ))
                          )}
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="turnos_disponiveis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turnos Disponíveis</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TURNOS.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
