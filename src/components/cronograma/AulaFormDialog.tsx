import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Aula, AulaFormData } from "@/hooks/useCronograma";
import { Loader2 } from "lucide-react";

const aulaSchema = z.object({
  turma_id: z.string().min(1, "Selecione uma turma"),
  disciplina_id: z.string().optional(),
  professor_id: z.string().optional(),
  data_aula: z.string().min(1, "Data obrigatória"),
  hora_inicio: z.string().min(1, "Horário inicial obrigatório"),
  hora_fim: z.string().min(1, "Horário final obrigatório"),
  status_aula: z.string().optional(),
  observacoes: z.string().optional(),
});

interface AulaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aula?: Aula | null;
  defaultDate?: string;
  onSubmit: (data: AulaFormData) => Promise<void>;
  isSubmitting?: boolean;
  turmas: Array<{ id: string; nome: string; curso: string | null }>;
  professores: Array<{ id: string; nome: string; valor_hora: number }>;
  disciplinas: Array<{ id: string; nome: string; curso: string | null }>;
}

export const AulaFormDialog = ({
  open,
  onOpenChange,
  aula,
  defaultDate,
  onSubmit,
  isSubmitting,
  turmas,
  professores,
  disciplinas,
}: AulaFormDialogProps) => {
  const isEditing = !!aula;

  const form = useForm<AulaFormData>({
    resolver: zodResolver(aulaSchema),
    defaultValues: {
      turma_id: "",
      disciplina_id: "",
      professor_id: "",
      data_aula: defaultDate || format(new Date(), "yyyy-MM-dd"),
      hora_inicio: "08:00",
      hora_fim: "12:00",
      status_aula: "Agendada",
      observacoes: "",
    },
  });

  useEffect(() => {
    if (aula) {
      form.reset({
        turma_id: aula.turma_id || "",
        disciplina_id: aula.disciplina_id || "",
        professor_id: aula.professor_id || "",
        data_aula: aula.data_aula,
        hora_inicio: aula.hora_inicio,
        hora_fim: aula.hora_fim,
        status_aula: aula.status_aula || "Agendada",
        observacoes: aula.observacoes || "",
      });
    } else {
      form.reset({
        turma_id: "",
        disciplina_id: "",
        professor_id: "",
        data_aula: defaultDate || format(new Date(), "yyyy-MM-dd"),
        hora_inicio: "08:00",
        hora_fim: "12:00",
        status_aula: "Agendada",
        observacoes: "",
      });
    }
  }, [aula, defaultDate, form]);

  const handleSubmit = async (data: AulaFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Aula" : "Nova Aula"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="turma_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Turma *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma turma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {turmas.map((turma) => (
                        <SelectItem key={turma.id} value={turma.id}>
                          {turma.nome} {turma.curso && `- ${turma.curso}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="professor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Professor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {professores.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disciplina_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disciplina</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {disciplinas.map((disc) => (
                          <SelectItem key={disc.id} value={disc.id}>
                            {disc.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="data_aula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hora_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hora_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status_aula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Agendada">Agendada</SelectItem>
                      <SelectItem value="Confirmada">Confirmada</SelectItem>
                      <SelectItem value="Realizada">Realizada</SelectItem>
                      <SelectItem value="Cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Anotações sobre a aula..."
                      rows={3}
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
                {isEditing ? "Salvar" : "Agendar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
