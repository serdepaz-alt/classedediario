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

export interface ImportTarget {
  disciplina_id: string;
  turma_id: string | null;
  data_inicio: string;
}

interface ImportPdfConteudoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (
    aulas: AulaGerada[],
    disciplinaNome: string,
    targets: ImportTarget[],
  ) => void;
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
  const [selectedPadraoId, setSelectedPadraoId] = useState("");
  const [aulasGeradas, setAulasGeradas] = useState<AulaGerada[]>([]);
  const [expandedAula, setExpandedAula] = useState<number | null>(null);
  const [processingMessage, setProcessingMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1) Fonte oficial das disciplinas elegíveis = Padrão de Marcação por Disciplina
  const { data: padroes = [] } = useQuery({
    queryKey: ["padroes-for-import", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("padroes_disciplinas")
        .select("id, nome, turno, carga_horaria_total, carga_horaria_diaria")
        .eq("user_id", user.id)
        .order("nome", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const selectedPadrao = padroes.find((p: any) => p.id === selectedPadraoId);

  const normalize = (s: string) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  // Disciplinas (instâncias por turma) — usadas para enriquecer o dropdown do Padrão
  // com as turmas vinculadas (mesmo nome + turno).
  const { data: disciplinasAll = [] } = useQuery({
    queryKey: ["disciplinas-todas-padrao", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("disciplinas")
        .select("id, nome, turno, data_inicio, data_termino, turma_id, turmas:turma_id(nome)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && open,
  });

  const turmasPorPadrao = (padrao: any) => {
    if (!padrao) return [] as any[];
    const alvoNome = normalize(padrao.nome);
    return (disciplinasAll as any[]).filter(
      (d) => d.turno === padrao.turno && normalize(d.nome) === alvoNome,
    );
  };

  // 2) Turmas ativas que receberão o plano (Módulo de Presença individualizado)
  const turmasAlvo = turmasPorPadrao(selectedPadrao);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast.error("Por favor, selecione um arquivo PDF");
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || !selectedPadrao) return;

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

      // Usa a data de início da turma ativa mais cedo como referência para a IA gerar a sequência.
      // As datas finais serão recalculadas por turma no momento da persistência.
      const ref = [...turmasAlvo].sort((a: any, b: any) =>
        String(a.data_inicio).localeCompare(String(b.data_inicio)),
      )[0] as any;

      const { data, error } = await supabase.functions.invoke("generate-programmatic-content", {
        body: {
          pdfText,
          disciplinaNome: selectedPadrao.nome,
          dataInicio: ref?.data_inicio || new Date().toISOString().slice(0, 10),
          dataTermino: ref?.data_termino || null,
          // padrão guarda horas/dia (ex.: 3); a função espera minutos
          cargaHorariaDiaria: (selectedPadrao.carga_horaria_diaria || 1) * 60,
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
    const targets: ImportTarget[] = (turmasAlvo as any[]).map((d) => ({
      disciplina_id: d.id,
      turma_id: d.turma_id || null,
      data_inicio: d.data_inicio,
    }));
    if (targets.length === 0) {
      toast.error("Nenhuma turma ativa vinculada a esta disciplina do Padrão de Marcação");
      return;
    }
    onImportComplete(aulasGeradas, selectedPadrao?.nome || "", targets);
    handleReset();
  };

  const handleReset = () => {
    setStep("upload");
    setSelectedFile(null);
    setSelectedPadraoId("");
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
              <Label>Disciplina (Padrão de Marcação)</Label>
              <Select value={selectedPadraoId} onValueChange={setSelectedPadraoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a disciplina do Padrão de Marcação" />
                </SelectTrigger>
                <SelectContent>
                  {(padroes as any[]).map((p) => {
                    const turmas = turmasPorPadrao(p);
                    const turmasLabel = turmas
                      .map((d: any) => (d.turmas as any)?.nome)
                      .filter(Boolean)
                      .join(", ");
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        <span>
                          {p.nome} — {p.turno} ({p.carga_horaria_total}h)
                          {turmas.length > 0 ? (
                            <span className="text-muted-foreground">
                              {" "}· Turmas: {turmasLabel}
                            </span>
                          ) : (
                            <span className="text-destructive">
                              {" "}· sem turma vinculada
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
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

            {selectedPadrao && (
              <Card className="bg-muted/50">
                <CardContent className="p-3 text-sm space-y-1">
                  <p><strong>Turno:</strong> {selectedPadrao.turno} • <strong>Carga:</strong> {selectedPadrao.carga_horaria_total}h ({selectedPadrao.carga_horaria_diaria}h/dia)</p>
                  <p>
                    <strong>Turmas ativas vinculadas:</strong>{" "}
                    {turmasAlvo.length === 0
                      ? "Nenhuma — cadastre a disciplina em uma turma"
                      : (turmasAlvo as any[])
                          .map((d) => (d.turmas as any)?.nome || "Sem turma")
                          .join(", ")}
                  </p>
                  {turmasAlvo.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      O plano será vinculado ao Módulo de Presença de cada turma, com datas recalculadas a partir do <em>data de início</em> de cada uma.
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleReset}>Cancelar</Button>
              <Button
                onClick={handleProcess}
                disabled={!selectedFile || !selectedPadraoId || turmasAlvo.length === 0}
              >
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
