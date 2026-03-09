import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  CheckCircle,
  Plus,
  FileText,
  Target,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";

interface AulaProgramatica {
  id: string;
  topico: string;
  objetivo: string | null;
  metodologia: string | null;
  recursos: string | null;
  tipo_avaliacao: string;
  data_aula: string;
  status: string;
  disciplina_nome: string;
}

interface AttendanceLessonPlanSelectorProps {
  disciplinaId: string | null;
  disciplinaNome: string;
  turmaId: string | null;
  selectedDate: Date;
  selectedAulaId: string | null;
  onSelectAula: (aulaId: string | null) => void;
  seguiuPlanejado: boolean;
  onSeguiuPlanejadoChange: (value: boolean) => void;
  conteudoMinistrado: string;
  onConteudoMinistradoChange: (value: string) => void;
  observacoesAula: string;
  onObservacoesAulaChange: (value: string) => void;
}

export const AttendanceLessonPlanSelector = ({
  disciplinaId,
  disciplinaNome,
  turmaId,
  selectedDate,
  selectedAulaId,
  onSelectAula,
  seguiuPlanejado,
  onSeguiuPlanejadoChange,
  conteudoMinistrado,
  onConteudoMinistradoChange,
  observacoesAula,
  onObservacoesAulaChange,
}: AttendanceLessonPlanSelectorProps) => {
  const { user } = useAuth();
  const [aulas, setAulas] = useState<AulaProgramatica[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickTopico, setQuickTopico] = useState("");
  const [quickObjetivo, setQuickObjetivo] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    const fetchAulas = async () => {
      if (!user?.id || !disciplinaId) {
        setAulas([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from("conteudo_programatico_aulas")
        .select("*")
        .eq("user_id", user.id)
        .eq("disciplina_id", disciplinaId)
        .eq("data_aula", dateStr)
        .order("topico", { ascending: true });

      if (!error && data) {
        setAulas(data as AulaProgramatica[]);
        // Auto-select if only one
        if (data.length === 1 && !selectedAulaId) {
          onSelectAula(data[0].id);
        }
      }
      setIsLoading(false);
    };

    fetchAulas();
  }, [user?.id, disciplinaId, dateStr]);

  const handleQuickCreate = async () => {
    if (!user?.id || !quickTopico.trim()) {
      toast.warning("Informe ao menos o tópico da aula");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("conteudo_programatico_aulas")
        .insert({
          user_id: user.id,
          disciplina_id: disciplinaId || null,
          turma_id: turmaId || null,
          disciplina_nome: disciplinaNome,
          data_aula: dateStr,
          topico: quickTopico.trim(),
          objetivo: quickObjetivo.trim() || null,
          tipo_avaliacao: "aula",
          status: "planejado",
        })
        .select()
        .single();

      if (error) throw error;

      setAulas((prev) => [...prev, data as AulaProgramatica]);
      onSelectAula(data.id);
      setShowQuickCreate(false);
      setQuickTopico("");
      setQuickObjetivo("");
      toast.success("Plano de aula criado!");
    } catch (err: any) {
      toast.error("Erro ao criar plano: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedAula = aulas.find((a) => a.id === selectedAulaId);

  if (isLoading) {
    return (
      <div className="py-3 text-center text-sm text-muted-foreground">
        Carregando planos de aula...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Separator />

      {/* Section Header */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">
          Plano de Aula
        </span>
        {aulas.length > 0 && (
          <Badge variant="outline" className="text-[10px]">
            {aulas.length} disponível(is)
          </Badge>
        )}
      </div>

      {/* Aula Cards */}
      {aulas.length > 0 ? (
        <div className="space-y-2">
          {aulas.map((aula) => {
            const isSelected = selectedAulaId === aula.id;
            return (
              <Card
                key={aula.id}
                className={`p-3 cursor-pointer transition-all border-2 ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:border-muted-foreground/20"
                }`}
                onClick={() => onSelectAula(isSelected ? null : aula.id)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">
                      {aula.topico}
                    </p>
                    {aula.objetivo && (
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Target className="w-3 h-3 shrink-0" />
                        <span className="truncate">{aula.objetivo}</span>
                      </p>
                    )}
                    {aula.metodologia && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        📋 {aula.metodologia}
                      </p>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] mt-1 ${
                        aula.status === "concluido"
                          ? "border-green-300 text-green-600"
                          : "border-blue-300 text-blue-600"
                      }`}
                    >
                      {aula.status === "concluido" ? "Concluído" : "Planejado"}
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-4 text-center border-dashed">
          <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground mb-2">
            Nenhum plano de aula para {format(selectedDate, "dd/MM/yyyy")}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuickCreate(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Criar Plano Rápido
          </Button>
        </Card>
      )}

      {/* Quick Create Form */}
      {showQuickCreate && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Plano Rápido</span>
          </div>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tópico / Conteúdo *</Label>
              <Input
                placeholder="Ex: Anatomia do sistema respiratório"
                value={quickTopico}
                onChange={(e) => setQuickTopico(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Objetivo (opcional)</Label>
              <Input
                placeholder="Ex: Compreender a fisiologia pulmonar"
                value={quickObjetivo}
                onChange={(e) => setQuickObjetivo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isCreating || !quickTopico.trim()}
                onClick={handleQuickCreate}
              >
                {isCreating ? "Criando..." : "Criar e Selecionar"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowQuickCreate(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Add quick create button when aulas exist */}
      {aulas.length > 0 && !showQuickCreate && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowQuickCreate(true)}
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Criar novo plano para hoje
        </Button>
      )}

      {/* Content Comparison Section */}
      {selectedAula && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Conteúdo Ministrado
              </span>
            </div>

            {/* Planned content reference */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">
                📋 Planejado:
              </p>
              <p className="text-sm text-foreground">{selectedAula.topico}</p>
              {selectedAula.objetivo && (
                <p className="text-xs text-muted-foreground mt-1">
                  Objetivo: {selectedAula.objetivo}
                </p>
              )}
            </div>

            {/* Checkbox: seguiu planejado */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="seguiu-planejado"
                checked={seguiuPlanejado}
                onCheckedChange={(checked) => {
                  onSeguiuPlanejadoChange(checked === true);
                  if (checked === true) {
                    onConteudoMinistradoChange(selectedAula.topico);
                  } else {
                    onConteudoMinistradoChange("");
                  }
                }}
              />
              <label
                htmlFor="seguiu-planejado"
                className="text-sm text-foreground cursor-pointer"
              >
                Seguiu o conteúdo planejado
              </label>
            </div>

            {/* Adaptações / conteúdo diferente */}
            {!seguiuPlanejado && (
              <div>
                <Label className="text-xs">
                  Descreva o conteúdo realmente ministrado
                </Label>
                <Textarea
                  placeholder="Adaptações feitas, conteúdo diferente do planejado..."
                  value={conteudoMinistrado}
                  onChange={(e) => onConteudoMinistradoChange(e.target.value)}
                  className="mt-1 min-h-[60px]"
                />
              </div>
            )}

            {/* Observações da aula */}
            <div>
              <Label className="text-xs">Observações da Aula (opcional)</Label>
              <Textarea
                placeholder="Dificuldades dos alunos, material extra utilizado..."
                value={observacoesAula}
                onChange={(e) => onObservacoesAulaChange(e.target.value)}
                className="mt-1 min-h-[60px]"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
