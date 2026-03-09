import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Upload, FileText, Loader2, Sparkles, BookOpen, Target, 
  Lightbulb, Monitor, CalendarCheck, ChevronDown, ChevronUp, Check 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";

export interface AulaGerada {
  data: string;
  topico: string;
  objetivo: string;
  metodologia: string;
  recursos: string;
  tipo_avaliacao: "aula" | "revisao" | "avaliacao";
  observacoes: string;
}

interface ImportPdfConteudoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (aulas: AulaGerada[], disciplinaNome: string, disciplinaId?: string, turmaId?: string) => void;
}

const tipoMap = {
  aula: { label: "Aula", color: "bg-primary/10 text-primary" },
  revisao: { label: "Revisão", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  avaliacao: { label: "Avaliação", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export const ImportPdfConteudoDialog = ({ open, onOpenChange, onImportComplete }: ImportPdfConteudoDialogProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState<"upload" | "processing" | "preview">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDisciplinaId, setSelectedDisciplinaId] = useState("");
  const [aulasGeradas, setAulasGeradas] = useState<AulaGerada[]>([]);
  const [expandedAula, setExpandedAula] = useState<number | null>(null);
  const [processingMessage, setProcessingMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: disciplinas = [] } = useQuery({
    queryKey: ["disciplinas-for-import", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome, data_inicio, data_termino, carga_horaria_diaria, turma_id, turmas:turma_id(nome)")
        .eq("user_id", user.id)
        .order("data_inicio", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const selectedDisc = disciplinas.find((d: any) => d.id === selectedDisciplinaId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast.error("Por favor, selecione um arquivo PDF");
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || !selectedDisc) return;

    setStep("processing");
    setProcessingMessage("Extraindo texto do PDF...");

    try {
      const pdfText = await extractTextFromPdf(selectedFile);

      if (!pdfText || pdfText.trim().length < 50) {
        toast.error("O PDF não contém texto suficiente para gerar o conteúdo");
        setStep("upload");
        return;
      }

      setProcessingMessage("Gerando plano de aulas com IA...");

      const { data, error } = await supabase.functions.invoke("generate-programmatic-content", {
        body: {
          pdfText,
          disciplinaNome: selectedDisc.nome,
          dataInicio: selectedDisc.data_inicio,
          dataTermino: selectedDisc.data_termino,
          cargaHorariaDiaria: selectedDisc.carga_horaria_diaria,
        },
      });

      if (error) throw error;

      if (data?.aulas && Array.isArray(data.aulas)) {
        setAulasGeradas(data.aulas);
        setStep("preview");
        toast.success(`${data.aulas.length} aulas geradas com sucesso!`);
      } else {
        throw new Error(data?.error || "Resposta inesperada da IA");
      }
    } catch (err: any) {
      console.error("Erro ao processar PDF:", err);
      toast.error(err.message || "Erro ao processar o PDF");
      setStep("upload");
    }
  };

  const handleConfirm = () => {
    onImportComplete(aulasGeradas, selectedDisc?.nome || "", selectedDisciplinaId, (selectedDisc as any)?.turma_id || undefined);
    handleReset();
  };

  const handleReset = () => {
    setStep("upload");
    setSelectedFile(null);
    setSelectedDisciplinaId("");
    setAulasGeradas([]);
    setExpandedAula(null);
    onOpenChange(false);
  };

  const stats = {
    aulas: aulasGeradas.filter((a) => a.tipo_avaliacao === "aula").length,
    revisoes: aulasGeradas.filter((a) => a.tipo_avaliacao === "revisao").length,
    avaliacoes: aulasGeradas.filter((a) => a.tipo_avaliacao === "avaliacao").length,
  };

  return (
    <Dialog open={open} onOpenChange={handleReset}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Importar Conteúdo Programático via PDF
          </DialogTitle>
          <DialogDescription>
            Carregue o PDF da ementa e a IA gerará o plano de aulas com objetivos, metodologias e avaliações
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Disciplina</Label>
              <Select value={selectedDisciplinaId} onValueChange={setSelectedDisciplinaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nome} — {(d.turmas as any)?.nome || "Sem turma"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Arquivo PDF (ementa / conteúdo programático)</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Clique para selecionar o PDF da ementa ou conteúdo programático
                    </p>
                  </>
                )}
              </div>
            </div>

            {selectedDisc && (
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm space-y-1">
                  <p><strong>Período:</strong> {selectedDisc.data_inicio} a {selectedDisc.data_termino}</p>
                  <p><strong>Carga horária diária:</strong> {selectedDisc.carga_horaria_diaria} min</p>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>Cancelar</Button>
              <Button onClick={handleProcess} disabled={!selectedFile || !selectedDisciplinaId}>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar com IA
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-lg font-medium">{processingMessage}</p>
            <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos...</p>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-primary/5">
                <CardContent className="p-3 text-center">
                  <BookOpen className="w-5 h-5 mx-auto text-primary mb-1" />
                  <p className="text-2xl font-bold">{stats.aulas}</p>
                  <p className="text-xs text-muted-foreground">Aulas</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-50 dark:bg-amber-900/10">
                <CardContent className="p-3 text-center">
                  <Lightbulb className="w-5 h-5 mx-auto text-amber-600 mb-1" />
                  <p className="text-2xl font-bold">{stats.revisoes}</p>
                  <p className="text-xs text-muted-foreground">Revisões</p>
                </CardContent>
              </Card>
              <Card className="bg-red-50 dark:bg-red-900/10">
                <CardContent className="p-3 text-center">
                  <CalendarCheck className="w-5 h-5 mx-auto text-red-600 mb-1" />
                  <p className="text-2xl font-bold">{stats.avaliacoes}</p>
                  <p className="text-xs text-muted-foreground">Avaliações</p>
                </CardContent>
              </Card>
            </div>

            {/* Aulas list */}
            <ScrollArea className="flex-1 max-h-[400px]">
              <div className="space-y-2 pr-4">
                {aulasGeradas.map((aula, idx) => {
                  const tipo = tipoMap[aula.tipo_avaliacao] || tipoMap.aula;
                  const isExpanded = expandedAula === idx;

                  return (
                    <Card key={idx} className="overflow-hidden">
                      <div
                        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedAula(isExpanded ? null : idx)}
                      >
                        <span className="text-xs font-mono text-muted-foreground w-6">{idx + 1}</span>
                        <Badge className={`${tipo.color} border-0 text-xs`}>{tipo.label}</Badge>
                        <span className="text-xs text-muted-foreground">{aula.data}</span>
                        <span className="font-medium text-sm flex-1 truncate">{aula.topico}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>

                      {isExpanded && (
                        <CardContent className="pt-0 pb-3 px-3 space-y-2 text-sm border-t">
                          <div className="grid gap-2 pt-2">
                            <div className="flex gap-2">
                              <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Objetivo</p>
                                <p>{aula.objetivo}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Metodologia</p>
                                <p>{aula.metodologia}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Monitor className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground">Recursos</p>
                                <p>{aula.recursos}</p>
                              </div>
                            </div>
                            {aula.observacoes && (
                              <div className="text-xs text-muted-foreground italic mt-1">
                                💡 {aula.observacoes}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={handleConfirm}>
                <Check className="w-4 h-4 mr-2" />
                Confirmar e Importar ({aulasGeradas.length} aulas)
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
