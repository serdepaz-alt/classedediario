import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Upload, FileText, Trash2, Download, Loader2, 
  File, FileImage, FileVideo, FileAudio, FolderOpen 
} from "lucide-react";
import { useConteudoProgramaticoDocs } from "@/hooks/useConteudoProgramaticoDocs";
import { useConteudoProgramaticoAulas } from "@/hooks/useConteudoProgramaticoAulas";
import { usePadroesDisciplinas } from "@/hooks/usePadroesDisciplinas";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DocumentUploadSectionProps {
  turmaId?: string;
  disciplinaId?: string;
}

const getFileIcon = (tipo: string) => {
  if (tipo.startsWith("image/")) return FileImage;
  if (tipo.startsWith("video/")) return FileVideo;
  if (tipo.startsWith("audio/")) return FileAudio;
  if (tipo.includes("pdf")) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const DocumentUploadSection = ({ turmaId, disciplinaId }: DocumentUploadSectionProps) => {
  const { documentos, isLoading, uploadDocumento, deleteDocumento, getDownloadUrl } = useConteudoProgramaticoDocs(turmaId, disciplinaId);
  const { padroes } = usePadroesDisciplinas();
  const { salvarAulasImportadas } = useConteudoProgramaticoAulas();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [descricao, setDescricao] = useState("");
  const [selectedPadraoId, setSelectedPadraoId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsUploadDialogOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const padrao = padroes.find((p) => p.id === selectedPadraoId);
    if (!padrao) {
      toast.error("Selecione uma disciplina do Padrão de Marcação");
      return;
    }

    setIsUploading(true);
    try {
      setProcessingMessage("Enviando documento...");
      await uploadDocumento.mutateAsync({
        file: selectedFile,
        turmaId,
        disciplinaId,
        descricao: descricao ? `[${padrao.nome}] ${descricao}` : `[${padrao.nome}]`,
      });

      if (selectedFile.type === "application/pdf") {
        try {
          setProcessingMessage("Extraindo texto do PDF...");
          const pdfText = await extractTextFromPdf(selectedFile);

          if (pdfText && pdfText.trim().length >= 50) {
            setProcessingMessage("Gerando plano de aulas dia a dia com IA...");
            const { data, error } = await supabase.functions.invoke(
              "generate-programmatic-content",
              {
                body: {
                  pdfText,
                  disciplinaNome: padrao.nome,
                  cargaHorariaDiaria: padrao.carga_horaria_diaria * 60,
                },
              }
            );

            if (!error && data?.aulas && Array.isArray(data.aulas) && data.aulas.length > 0) {
              await salvarAulasImportadas.mutateAsync({
                aulasData: data.aulas,
                disciplinaId,
                turmaId,
                disciplinaNome: padrao.nome,
              });
            } else if (error) {
              console.error("Erro IA:", error);
              toast.error("Documento salvo, mas não foi possível gerar o plano de aulas");
            }
          }
        } catch (aiErr) {
          console.error("Erro ao processar PDF com IA:", aiErr);
          toast.error("Documento salvo, mas falhou ao gerar plano de aulas");
        }
      }

      setIsUploadDialogOpen(false);
      setSelectedFile(null);
      setDescricao("");
      setSelectedPadraoId("");
    } finally {
      setIsUploading(false);
      setProcessingMessage("");
    }
  };

  const handleDownload = async (storagePath: string, nomeArquivo: string) => {
    const url = await getDownloadUrl(storagePath);
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = nomeArquivo;
      link.click();
    }
  };

  const handleDelete = async (id: string, storagePath: string) => {
    if (confirm("Tem certeza que deseja remover este documento?")) {
      await deleteDocumento.mutateAsync({ id, storagePath });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              Documentos do Conteúdo Programático
            </CardTitle>
            <CardDescription>
              Faça upload de ementas, planos de ensino e materiais complementares
            </CardDescription>
          </div>
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
            />
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Enviar Documento
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum documento enviado</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">
              Envie ementas, planos de ensino, cronogramas ou outros documentos relacionados ao conteúdo programático.
            </p>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Enviar Primeiro Documento
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-center">Tamanho</TableHead>
                  <TableHead className="text-center">Data</TableHead>
                  <TableHead className="text-center w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documentos.map((doc) => {
                  const FileIcon = getFileIcon(doc.tipo_arquivo);
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileIcon className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium truncate max-w-[200px]">
                            {doc.nome_arquivo}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {doc.descricao || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(doc.tamanho_bytes)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {doc.created_at 
                          ? format(parseISO(doc.created_at), "dd/MM/yy", { locale: ptBR })
                          : "—"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleDownload(doc.storage_path, doc.nome_arquivo)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(doc.id, doc.storage_path)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog de Upload */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar Documento</DialogTitle>
              <DialogDescription>
                Adicione uma descrição opcional para o documento
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <FileText className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="padrao">Disciplina (Padrão de Marcação)</Label>
                <Select value={selectedPadraoId} onValueChange={setSelectedPadraoId}>
                  <SelectTrigger id="padrao">
                    <SelectValue placeholder="Selecione a disciplina para associar" />
                  </SelectTrigger>
                  <SelectContent>
                    {padroes.length === 0 ? (
                      <div className="px-2 py-3 text-xs text-muted-foreground">
                        Nenhum padrão cadastrado
                      </div>
                    ) : (
                      padroes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nome} — {p.turno} ({p.carga_horaria_total}h)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedFile?.type === "application/pdf" && selectedPadraoId && (
                  <p className="text-xs text-muted-foreground">
                    A IA irá gerar automaticamente o plano de aulas dia a dia (Aula 1 Dia 1, Aula 2 Dia 2…) a partir deste PDF.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea
                  id="descricao"
                  placeholder="Ex: Ementa da disciplina de Anatomia"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpload} disabled={isUploading || !selectedPadraoId}>
                {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isUploading ? (processingMessage || "Processando...") : "Enviar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
