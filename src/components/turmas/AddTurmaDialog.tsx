import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { z } from "zod";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Plus } from "lucide-react";

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

const HORARIOS_PADRAO = [
  "Matutino 7h às 10h",
  "Matutino 10h às 13h",
  "Vespertino 14h às 17h",
  "Vespertino 17h às 19h",
  "Noturno 19h às 21h",
  "3x na semana 8h às 13h",
];

const turmaSchema = z.object({
  nome: z.string().min(1, "Nome da turma é obrigatório"),
  nomenclatura: z.string().optional(),
  ano_letivo: z.coerce.number().min(2020, "Ano letivo inválido"),
  periodo: z.string().min(1, "Período é obrigatório"),
  curso: z.string().optional(),
  disciplina: z.string().optional(),
  horario: z.string().optional(),
  data_inicio: z.date().optional().nullable(),
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
    horario: string | null;
    data_inicio: string | null;
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
  const [customHorarios, setCustomHorarios] = useState<string[]>([]);
  const [newHorario, setNewHorario] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const isEditing = !!turma;

  const allHorarios = [...HORARIOS_PADRAO, ...customHorarios];

  const form = useForm<TurmaFormData>({
    resolver: zodResolver(turmaSchema),
    defaultValues: {
      nome: "",
      nomenclatura: "",
      ano_letivo: new Date().getFullYear(),
      periodo: "",
      curso: "",
      disciplina: "",
      horario: "",
      data_inicio: null,
      status: "Ativa",
    },
  });

  useEffect(() => {
    if (open) {
      if (turma) {
        // If the turma has a horario not in the defaults, add it as custom
        if (turma.horario && !HORARIOS_PADRAO.includes(turma.horario)) {
          setCustomHorarios((prev) =>
            prev.includes(turma.horario!) ? prev : [...prev, turma.horario!]
          );
        }
        form.reset({
          nome: turma.nome || "",
          nomenclatura: "",
          ano_letivo: turma.ano_letivo || new Date().getFullYear(),
          periodo: turma.periodo || "",
          curso: turma.curso || "",
          disciplina: turma.disciplina || "",
          horario: turma.horario || "",
          data_inicio: turma.data_inicio ? new Date(turma.data_inicio + "T00:00:00") : null,
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
          horario: "",
          data_inicio: null,
          status: "Ativa",
        });
      }
      setShowCustomInput(false);
      setNewHorario("");
    }
  }, [open, turma, form]);

  const handleAddCustomHorario = () => {
    const trimmed = newHorario.trim();
    if (trimmed && !allHorarios.includes(trimmed)) {
      setCustomHorarios((prev) => [...prev, trimmed]);
      form.setValue("horario", trimmed);
      setNewHorario("");
      setShowCustomInput(false);
    }
  };

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
            horario: data.horario || null,
            data_inicio: data.data_inicio ? format(data.data_inicio, "yyyy-MM-dd") : null,
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
          horario: data.horario || null,
          data_inicio: data.data_inicio ? format(data.data_inicio, "yyyy-MM-dd") : null,
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
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Turma</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: TE M03" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditing && (
              <FormField
                control={form.control}
                name="nomenclatura"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nomenclatura do Curso</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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
              <FormField
                control={form.control}
                name="ano_letivo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano Letivo</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Turno</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
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

            {/* Data de Início */}
            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Início</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy", { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={(date) => {
                          field.onChange(date);
                          if (date) {
                            form.setValue("ano_letivo", date.getFullYear());
                          }
                        }}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Horário */}
            <FormField
              control={form.control}
              name="horario"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Horário</FormLabel>
                  <div className="space-y-2">
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o horário" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-background z-50">
                        {allHorarios.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {showCustomInput ? (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Ex: Sábado 8h às 12h"
                          value={newHorario}
                          onChange={(e) => setNewHorario(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddCustomHorario();
                            }
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleAddCustomHorario}
                        >
                          OK
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setShowCustomInput(false);
                            setNewHorario("");
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowCustomInput(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Adicionar horário personalizado
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                  <Select onValueChange={field.onChange} value={field.value}>
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
