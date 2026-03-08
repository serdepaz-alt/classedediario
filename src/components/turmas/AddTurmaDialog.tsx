import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const NOMENCLATURAS_CURSO = [
  { sigla: "TE", nome: "Técnico em Enfermagem" },
  { sigla: "CI", nome: "Cuidador de Idosos" },
  { sigla: "HE", nome: "Hemodiálise" },
  { sigla: "UTI", nome: "UTI" },
  { sigla: "EM", nome: "Emergência" },
  { sigla: "AT", nome: "Atualização" },
  { sigla: "HC", nome: "Home Care" },
  { sigla: "CC", nome: "CME e CC" },
];

const turmaSchema = z.object({
  nome: z.string().min(1, "Nome da turma é obrigatório"),
  nomenclatura: z.string().optional(),
  ano_letivo: z.coerce.number().min(2020, "Ano letivo inválido"),
  periodo: z.string().min(1, "Período é obrigatório"),
  curso: z.string().optional(),
  disciplina: z.string().optional(),
  status: z.string().default("Ativa"),
});

type TurmaFormData = z.infer<typeof turmaSchema>;

interface AddTurmaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  turma?: {
    id: string;
    nome: string;
    ano_letivo: number;
    periodo: string | null;
    curso: string | null;
    disciplina: string | null;
    status: string | null;
  } | null;
}

export const AddTurmaDialog = ({
  open,
  onOpenChange,
  onSuccess,
  turma,
}: AddTurmaDialogProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!turma;

  const form = useForm<TurmaFormData>({
    resolver: zodResolver(turmaSchema),
    defaultValues: {
      nome: "",
      nomenclatura: "",
      ano_letivo: new Date().getFullYear(),
      periodo: "",
      curso: "",
      disciplina: "",
      status: "Ativa",
    },
  });

  // Reset form when dialog opens/closes or turma changes
  useEffect(() => {
    if (open) {
      if (turma) {
        form.reset({
          nome: turma.nome || "",
          nomenclatura: "",
          ano_letivo: turma.ano_letivo || new Date().getFullYear(),
          periodo: turma.periodo || "",
          curso: turma.curso || "",
          disciplina: turma.disciplina || "",
          status: turma.status || "Ativa",
        });
      } else {
        form.reset({
          nome: "",
          nomenclatura: "",
          ano_letivo: new Date().getFullYear(),
          periodo: "",
          curso: "",
          disciplina: "",
          status: "Ativa",
        });
      }
    }
  }, [open, turma, form]);

  const onSubmit = async (data: TurmaFormData) => {
    if (!user) {
      toast.error("Você precisa estar autenticado");
      return;
    }

    setIsLoading(true);
    try {
      if (turma) {
        const { error } = await supabase
          .from("turmas")
          .update({
            nome: data.nome,
            ano_letivo: data.ano_letivo,
            periodo: data.periodo,
            curso: data.curso || null,
            disciplina: data.disciplina || null,
            status: data.status,
          })
          .eq("id", turma.id);

        if (error) throw error;
        toast.success("Turma atualizada com sucesso!");
      } else {
        const { error } = await supabase.from("turmas").insert({
          user_id: user.id,
          nome: data.nome,
          ano_letivo: data.ano_letivo,
          periodo: data.periodo,
          curso: data.curso || null,
          disciplina: data.disciplina || null,
          status: data.status,
        });

        if (error) throw error;
        toast.success("Turma adicionada com sucesso!");
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving turma:", error);
      toast.error(error.message || "Erro ao salvar turma");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {turma ? "Editar Turma" : "Adicionar Turma"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome da Turma - Read-only when editing */}
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Turma</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: TE M03" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nomenclatura do Curso - Only shown when creating */}
            {!isEditing && (
              <FormField
                control={form.control}
                name="nomenclatura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomenclatura do Curso</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a nomenclatura" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background z-50">
                        {NOMENCLATURAS_CURSO.map((item) => (
                          <SelectItem key={item.sigla} value={item.sigla}>
                            {item.sigla} - {item.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Ano Letivo - Read-only when editing */}
              <FormField
                control={form.control}
                name="ano_letivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano Letivo</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Turno - Read-only when editing */}
              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o turno" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Manhã">Manhã</SelectItem>
                        <SelectItem value="Tarde">Tarde</SelectItem>
                        <SelectItem value="Noite">Noite</SelectItem>
                        <SelectItem value="Sábado">Sábado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Curso - Read-only when editing */}
            <FormField
              control={form.control}
              name="curso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Curso</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Técnico em Enfermagem"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="disciplina"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disciplina Principal</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Enfermagem em Clínica Médica"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="Ativa">Ativa</SelectItem>
                      <SelectItem value="Inativa">Inativa</SelectItem>
                      <SelectItem value="Aguardando">Aguardando</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Salvando..."
                  : turma
                  ? "Atualizar Turma"
                  : "Adicionar Turma"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};