import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, eachDayOfInterval, isWeekend } from "date-fns";
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
import { CalendarIcon, Save, X, Calculator, FileText, Plus, Minus, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminAuthDialog } from "./AdminAuthDialog";

const disciplinaSchema = z.object({
  turma_id: z.string().min(1, "Selecione a turma"),
  turno: z.string().min(1, "Selecione o turno"),
  curso: z.string().min(1, "Informe o curso"),
  nome: z.string().min(1, "Informe o nome da disciplina"),
  data_inicio: z.date({ required_error: "Selecione a data de início" }),
  data_termino: z.date({ required_error: "Selecione a data de término" }),
  carga_horaria_diaria: z.number().min(1, "Mínimo 1 hora"),
  nome_professor: z.string().optional(),
});

type DisciplinaFormData = z.infer<typeof disciplinaSchema>;

interface Turma {
  id: string;
  nome: string;
  ano_letivo: number;
  periodo: string | null;
  curso: string | null;
}

interface Feriado {
  id: string;
  data: string;
  nome: string;
  tipo: string | null;
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
  const [showExclusionsDialog, setShowExclusionsDialog] = useState(false);
  const [exclusionDates, setExclusionDates] = useState<{ data: string; nome: string; tipo: string }[]>([]);

  const form = useForm<DisciplinaFormData>({
    resolver: zodResolver(disciplinaSchema),
    defaultValues: {
      turma_id: "",
      turno: "",
      curso: "",
      nome: "",
      carga_horaria_diaria: 4, // Default 4 horas
      nome_professor: "",
    },
  });

  const dataInicio = form.watch("data_inicio");
  const dataTermino = form.watch("data_termino");
  const cargaHorariaDiaria = form.watch("carga_horaria_diaria");
  const selectedTurmaId = form.watch("turma_id");

  // Auto-fill curso when turma is selected
  useEffect(() => {
    if (selectedTurmaId) {
      const selectedTurma = turmas.find(t => t.id === selectedTurmaId);
      if (selectedTurma?.curso) {
        form.setValue("curso", selectedTurma.curso);
      }
    }
  }, [selectedTurmaId, turmas, form]);

  // Fetch turmas and feriados
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
      
      // Find holidays within the period
      const holidaysInPeriod = feriados.filter(f => {
        const feriadoDate = new Date(f.data);
        return feriadoDate >= dataInicio && feriadoDate <= dataTermino && !isWeekend(feriadoDate);
      });
      
      const holidayDates = holidaysInPeriod.map(f => f.data);
      const effectiveDays = businessDays.filter(
        day => !holidayDates.includes(format(day, "yyyy-MM-dd"))
      );
      
      const totalBusinessDays = businessDays.length;
      const subtractedDays = holidaysInPeriod.length;
      
      setDiasUteis(totalBusinessDays);
      setDiasSubtraidos(subtractedDays);
      setCargaHorariaTotal(effectiveDays.length * cargaHorariaDiaria);
      
      // Store exclusion dates for dialog
      setExclusionDates(holidaysInPeriod.map(f => ({
        data: f.data,
        nome: f.nome,
        tipo: f.tipo || "Feriado"
      })));
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
      // Create the disciplina
      const { data: disciplinaData, error } = await supabase.from("disciplinas").insert({
        user_id: user.id,
        turma_id: data.turma_id,
        nome: data.nome,
        turno: data.turno,
        curso: data.curso,
        data_inicio: format(data.data_inicio, "yyyy-MM-dd"),
        data_termino: format(data.data_termino, "yyyy-MM-dd"),
        carga_horaria_diaria: data.carga_horaria_diaria * 60, // Convert hours to minutes for storage
        carga_horaria_total: cargaHorariaTotal * 60, // Convert hours to minutes for storage
        dias_uteis: diasUteis,
        dias_subtraidos: diasSubtraidos,
        nome_professor: data.nome_professor || null,
      }).select().single();

      if (error) throw error;

      // Fetch students from the turma and create initial presence records
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id")
        .eq("turma_id", data.turma_id)
        .eq("user_id", user.id);

      if (studentsError) throw studentsError;

      if (students && students.length > 0 && disciplinaData) {
        // Create presence records for all students for the first day
        const today = format(new Date(), "yyyy-MM-dd");
        const presencaRecords = students.map(student => ({
          user_id: user.id,
          disciplina_id: disciplinaData.id,
          student_id: student.id,
          data: today,
          status: "presente"
        }));

        await supabase.from("presencas").insert(presencaRecords);
      }

      toast.success("Disciplina cadastrada e lista de presença carregada!");
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
    form.setValue("carga_horaria_diaria", current + 1);
  };

  const decrementCargaHoraria = () => {
    const current = form.getValues("carga_horaria_diaria");
    if (current > 1) {
      form.setValue("carga_horaria_diaria", current - 1);
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
    <>
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
                
                {/* First row: TURMA (emphasized), TURNO, CURSO */}
                <div className="grid grid-cols-12 gap-4">
                  <FormField
                    control={form.control}
                    name="turma_id"
                    render={({ field }) => (
                      <FormItem className="col-span-5">
                        <FormLabel className="text-base font-bold text-primary">Turma *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-primary border-2">
                              <SelectValue placeholder="Selecione a turma" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {turmas.map((turma) => (
                              <SelectItem key={turma.id} value={turma.id}>
                                {turma.nome} ({turma.ano_letivo})
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
                    name="turno"
                    render={({ field }) => (
                      <FormItem className="col-span-3">
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
                    name="curso"
                    render={({ field }) => (
                      <FormItem className="col-span-4">
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
                        <FormLabel>Carga Horária Diária (horas)</FormLabel>
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
                      <span className="font-medium">{cargaHorariaTotal} horas</span>
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
                    <FileText className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Quantidade de Dias</p>
                      <p className="font-bold">[ {diasUteis - diasSubtraidos} dias ]</p>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowExclusionsDialog(true)}
                  disabled={exclusionDates.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Detalhes das Exclusões
                  {exclusionDates.length > 0 && (
                    <span className="ml-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs">
                      {exclusionDates.length}
                    </span>
                  )}
                </Button>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Disciplina
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Detalhes das Exclusões */}
      <Dialog open={showExclusionsDialog} onOpenChange={setShowExclusionsDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes das Exclusões</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {exclusionDates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum feriado ou recesso no período selecionado.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Datas de feriados e recessos que foram excluídas do cálculo:
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {exclusionDates.map((exclusion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{exclusion.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(exclusion.data), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        {exclusion.tipo}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium">
                    Total de dias excluídos: <span className="text-primary">{exclusionDates.length}</span>
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
