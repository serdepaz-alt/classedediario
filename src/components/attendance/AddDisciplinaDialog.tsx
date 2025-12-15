import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInBusinessDays, eachDayOfInterval, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, X, Calculator, FileText, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminAuthDialog } from "./AdminAuthDialog";

const disciplinaSchema = z.object({
  turno: z.string().min(1, "Selecione o turno"),
  turma_id: z.string().min(1, "Selecione a turma"),
  curso: z.string().min(1, "Informe o curso"),
  nome: z.string().min(1, "Informe o nome da disciplina"),
  data_inicio: z.date({ required_error: "Selecione a data de início" }),
  data_termino: z.date({ required_error: "Selecione a data de término" }),
  carga_horaria_diaria: z.number().min(1, "Mínimo 1 minuto"),
  nome_professor: z.string().optional(),
});

type DisciplinaFormData = z.infer<typeof disciplinaSchema>;

interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  periodo: string | null;
}

interface Feriado {
  id: string;
  data: string;
  nome: string;
}

interface AddDisciplinaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddDisciplinaDialog = ({ open, onOpenChange, onSuccess }: AddDisciplinaDialogProps) => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [feriados, setFeriados] = useState<Feriado[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [diasUteis, setDiasUteis] = useState(0);
  const [diasSubtraidos, setDiasSubtraidos] = useState(0);
  const [cargaHorariaTotal, setCargaHorariaTotal] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DisciplinaFormData>({
    resolver: zodResolver(disciplinaSchema),
    defaultValues: {
      turno: "",
      turma_id: "",
      curso: "",
      nome: "",
      carga_horaria_diaria: 60,
      nome_professor: "",
    },
  });

  const dataInicio = form.watch("data_inicio");
  const dataTermino = form.watch("data_termino");
  const cargaHorariaDiaria = form.watch("carga_horaria_diaria");

  // Fetch turmas
  useEffect(() => {
    const fetchTurmas = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("turmas")
        .select("*")
        .eq("user_id", user.id);
      
      if (!error && data) {
        setTurmas(data);
      }
    };

    const fetchFeriados = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("feriados")
        .select("*")
        .eq("user_id", user.id);
      
      if (!error && data) {
        setFeriados(data);
      }
    };

    fetchTurmas();
    fetchFeriados();
  }, [user]);

  // Calculate working days and total hours
  useEffect(() => {
    if (dataInicio && dataTermino) {
      const allDays = eachDayOfInterval({ start: dataInicio, end: dataTermino });
      const businessDays = allDays.filter(day => !isWeekend(day));
      
      // Subtract holidays
      const holidayDates = feriados.map(f => f.data);
      const effectiveDays = businessDays.filter(
        day => !holidayDates.includes(format(day, "yyyy-MM-dd"))
      );
      
      const totalBusinessDays = businessDays.length;
      const subtractedDays = totalBusinessDays - effectiveDays.length;
      
      setDiasUteis(totalBusinessDays);
      setDiasSubtraidos(subtractedDays);
      setCargaHorariaTotal(effectiveDays.length * cargaHorariaDiaria);
    }
  }, [dataInicio, dataTermino, cargaHorariaDiaria, feriados]);

  // When dialog opens, request authentication
  useEffect(() => {
    if (open && !isAuthenticated) {
      setShowAuthDialog(true);
    }
  }, [open, isAuthenticated]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowAuthDialog(false);
  };

  const handleClose = () => {
    setIsAuthenticated(false);
    form.reset();
    onOpenChange(false);
  };

  const onSubmit = async (data: DisciplinaFormData) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("disciplinas").insert({
        user_id: user.id,
        turma_id: data.turma_id,
        nome: data.nome,
        turno: data.turno,
        curso: data.curso,
        data_inicio: format(data.data_inicio, "yyyy-MM-dd"),
        data_termino: format(data.data_termino, "yyyy-MM-dd"),
        carga_horaria_diaria: data.carga_horaria_diaria,
        carga_horaria_total: cargaHorariaTotal,
        dias_uteis: diasUteis,
        dias_subtraidos: diasSubtraidos,
        nome_professor: data.nome_professor || null,
      });

      if (error) throw error;

      toast.success("Disciplina cadastrada com sucesso!");
      handleClose();
      onSuccess();
    } catch (error: any) {
      toast.error("Erro ao cadastrar disciplina: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const incrementCargaHoraria = () => {
    const current = form.getValues("carga_horaria_diaria");
    form.setValue("carga_horaria_diaria", current + 10);
  };

  const decrementCargaHoraria = () => {
    const current = form.getValues("carga_horaria_diaria");
    if (current > 10) {
      form.setValue("carga_horaria_diaria", current - 10);
    }
  };

  if (!isAuthenticated) {
    return (
      <AdminAuthDialog
        open={showAuthDialog}
        onOpenChange={(open) => {
          setShowAuthDialog(open);
          if (!open) handleClose();
        }}
        onSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Cadastro de Nova Disciplina</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Dados Básicos */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b pb-2">Dados Básicos</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="turno"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turno</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Turno" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Matutino">Matutino</SelectItem>
                          <SelectItem value="Vespertino">Vespertino</SelectItem>
                          <SelectItem value="Noturno">Noturno</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="turma_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turma</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Turma" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {turmas.map((turma) => (
                            <SelectItem key={turma.id} value={turma.id}>
                              {turma.nome}
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
                  name="curso"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Curso</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Curso" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Ensino Médio">Ensino Médio</SelectItem>
                          <SelectItem value="Técnico em Informática">Técnico em Informática</SelectItem>
                          <SelectItem value="Técnico em Administração">Técnico em Administração</SelectItem>
                          <SelectItem value="Técnico em Enfermagem">Técnico em Enfermagem</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Disciplina</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Matemática I" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Período e Carga Horária */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b pb-2">Período e Carga Horária</h3>
              
              <div className="grid grid-cols-2 gap-4">
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
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="data_termino"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Término</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecione"}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            locale={ptBR}
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="carga_horaria_diaria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carga Horária Diária (min)</FormLabel>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={decrementCargaHoraria}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            className="text-center"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={incrementCargaHoraria}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Carga Horária Total</FormLabel>
                  <div className="h-10 px-3 py-2 rounded-md border bg-muted flex items-center">
                    <span className="font-medium">{cargaHorariaTotal} min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Auditoria do Período */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground border-b pb-2">Auditoria do Período</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Calculator className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dias Úteis Calculados</p>
                    <p className="font-bold">[ {diasUteis} dias ]</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <X className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dias Subtraídos</p>
                    <p className="font-bold">[ {diasSubtraidos} dias ]</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <FileText className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quantidade de Dias</p>
                    <p className="font-bold">[ {diasUteis - diasSubtraidos} dias ]</p>
                  </div>
                </div>
              </div>

              <Button type="button" variant="outline" className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Ver Detalhes das Exclusões
              </Button>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? "Salvando..." : "Salvar Disciplina"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
