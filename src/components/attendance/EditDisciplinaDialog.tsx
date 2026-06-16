import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CalendarIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Disciplina {
  id: string;
  nome: string;
  turno: string;
  curso: string;
  data_inicio: string;
  data_termino: string;
  carga_horaria_diaria: number;
  carga_horaria_total: number | null;
  dias_uteis: number | null;
  dias_subtraidos: number | null;
  nome_professor: string | null;
  turma_id: string | null;
  turmas?: {
    nome: string;
  } | null;
}

interface Turma {
  id: string;
  nome: string;
  curso: string | null;
}

interface EditDisciplinaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disciplina: Disciplina | null;
  onSuccess: () => void;
}

export const EditDisciplinaDialog = ({
  open,
  onOpenChange,
  disciplina,
  onSuccess,
}: EditDisciplinaDialogProps) => {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: "",
    turno: "",
    curso: "",
    turma_id: "",
    data_inicio: undefined as Date | undefined,
    data_termino: undefined as Date | undefined,
    carga_horaria_diaria: 60,
    nome_professor: "",
  });

  useEffect(() => {
    if (disciplina) {
      setFormData({
        nome: disciplina.nome,
        turno: disciplina.turno,
        curso: disciplina.curso,
        turma_id: disciplina.turma_id || "",
        data_inicio: new Date(disciplina.data_inicio + "T00:00:00"),
        data_termino: new Date(disciplina.data_termino + "T00:00:00"),
        carga_horaria_diaria: disciplina.carga_horaria_diaria,
        nome_professor: disciplina.nome_professor || "",
      });
    }
  }, [disciplina]);

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

    if (open) {
      fetchTurmas();
    }
  }, [user, open]);

  const handleSave = async () => {
    if (!user || !disciplina) return;

    if (!formData.nome || !formData.turma_id || !formData.data_inicio || !formData.data_termino) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("disciplinas")
        .update({
          nome: formData.nome,
          turno: formData.turno,
          curso: formData.curso,
          turma_id: formData.turma_id,
          data_inicio: format(formData.data_inicio, "yyyy-MM-dd"),
          data_termino: format(formData.data_termino, "yyyy-MM-dd"),
          carga_horaria_diaria: formData.carga_horaria_diaria,
          nome_professor: formData.nome_professor || null,
        })
        .eq("id", disciplina.id);

      if (error) throw error;

      toast.success("Disciplina atualizada com sucesso! Os alunos da turma estão prontos para a chamada.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao atualizar disciplina: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!disciplina) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Disciplina</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Disciplina</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Matemática I"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Turma</Label>
              <Select
                value={formData.turma_id}
                onValueChange={(value) => {
                  const turma = turmas.find(t => t.id === value);
                  setFormData({ 
                    ...formData, 
                    turma_id: value,
                    curso: turma?.curso || formData.curso 
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {turmas.map((turma) => (
                    <SelectItem key={turma.id} value={turma.id}>
                      {turma.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Turno</Label>
              <Select
                value={formData.turno}
                onValueChange={(value) => setFormData({ ...formData, turno: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Matutino">Matutino</SelectItem>
                  <SelectItem value="Vespertino">Vespertino</SelectItem>
                  <SelectItem value="Noturno">Noturno</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_inicio && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_inicio
                      ? format(formData.data_inicio, "dd/MM/yyyy")
                      : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.data_inicio}
                    onSelect={(date) => setFormData({ ...formData, data_inicio: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data de Término</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_termino && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_termino
                      ? format(formData.data_termino, "dd/MM/yyyy")
                      : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.data_termino}
                    onSelect={(date) => setFormData({ ...formData, data_termino: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="carga">Carga Horária Diária (min)</Label>
              <Input
                id="carga"
                type="number"
                value={formData.carga_horaria_diaria}
                onChange={(e) => setFormData({ ...formData, carga_horaria_diaria: parseInt(e.target.value) || 60 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="professor">Professor</Label>
              <Input
                id="professor"
                value={formData.nome_professor}
                onChange={(e) => setFormData({ ...formData, nome_professor: e.target.value })}
                placeholder="Nome do professor"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Salvando..." : "Salvar e Carregar Chamada"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
