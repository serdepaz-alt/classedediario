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
import { Professor, ProfessorFormData } from "@/hooks/useProfessores";
import { Loader2 } from "lucide-react";

const professorSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().max(20).optional().or(z.literal("")),
  valor_hora: z.coerce.number().min(0, "Valor deve ser positivo"),
  especialidade: z.string().max(100).optional().or(z.literal("")),
  status: z.string().optional(),
});

interface ProfessorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professor?: Professor | null;
  onSubmit: (data: ProfessorFormData) => Promise<void>;
  isSubmitting?: boolean;
}

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
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      valor_hora: 50,
      especialidade: "",
      status: "Ativo",
    },
  });

  useEffect(() => {
    if (professor) {
      form.reset({
        nome: professor.nome,
        email: professor.email || "",
        telefone: professor.telefone || "",
        valor_hora: professor.valor_hora,
        especialidade: professor.especialidade || "",
        status: professor.status || "Ativo",
      });
    } else {
      form.reset({
        nome: "",
        email: "",
        telefone: "",
        valor_hora: 50,
        especialidade: "",
        status: "Ativo",
      });
    }
  }, [professor, form]);

  const handleSubmit = async (data: ProfessorFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Professor" : "Novo Professor"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor_hora"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor/Hora (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="50.00"
                        {...field}
                      />
                    </FormControl>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      value={field.value}
                    >
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

            <FormField
              control={form.control}
              name="especialidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Especialidade</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Matemática, Português, etc."
                      {...field}
                    />
                  </FormControl>
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
