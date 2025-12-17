import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ParsedStudent {
  matricula: string;
  nome: string;
  data_nascimento: string | null;
  local_nascimento: string | null;
  estado_nascimento: string | null;
  nome_pai: string | null;
  nome_mae: string | null;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  titulo_eleitoral: string | null;
  endereco: string | null;
  data_matricula: string | null;
}

interface ParsedTurma {
  nome: string;
  turno: string | null;
  curso: string | null;
  data_inicio: string | null;
}

interface ImportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ImportPdfDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: ImportPdfDialogProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "success">("upload");
  const [parsedData, setParsedData] = useState<{
    turma: ParsedTurma;
    students: ParsedStudent[];
  } | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
    } else {
      toast.error("Por favor, selecione um arquivo PDF");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        toast.error("Por favor, selecione um arquivo PDF");
      }
    }
  };

  const readFileAsText = async (file: File): Promise<string> => {
    // Convert PDF to text using pdf.js-like approach
    // For now, we'll read as ArrayBuffer and send to the edge function
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Convert to base64 for transmission
        const base64 = btoa(
          new Uint8Array(reader.result as ArrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleParsePdf = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      // For simplicity, we'll use a text extraction approach
      // The edge function will use AI to parse the structured data
      const text = await selectedFile.text();
      
      const { data, error } = await supabase.functions.invoke("parse-enrollment-pdf", {
        body: { pdfContent: text },
      });

      if (error) throw error;

      if (data.success && data.data) {
        setParsedData(data.data);
        setStep("preview");
        toast.success(`${data.data.students.length} alunos encontrados!`);
      } else {
        throw new Error(data.error || "Erro ao processar PDF");
      }
    } catch (error: any) {
      console.error("Error parsing PDF:", error);
      toast.error(error.message || "Erro ao processar o PDF");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!user || !parsedData) return;

    setStep("importing");
    try {
      // Map turno from PDF to database format
      const turnoMap: Record<string, string> = {
        "Matutino": "Manhã",
        "Vespertino": "Tarde",
        "Noturno": "Noite",
        "Sábado": "Sábado",
      };

      // Create turma
      const { data: turmaData, error: turmaError } = await supabase
        .from("turmas")
        .insert({
          user_id: user.id,
          nome: parsedData.turma.nome,
          ano_letivo: parsedData.turma.data_inicio 
            ? parseInt(parsedData.turma.data_inicio.split("-")[0]) 
            : new Date().getFullYear(),
          periodo: turnoMap[parsedData.turma.turno || ""] || parsedData.turma.turno,
          curso: parsedData.turma.curso,
          status: "Ativa",
        })
        .select()
        .single();

      if (turmaError) throw turmaError;

      // Import students
      const studentsToInsert = parsedData.students.map((student) => ({
        user_id: user.id,
        turma_id: turmaData.id,
        matricula: student.matricula,
        nome: student.nome,
        data_nascimento: student.data_nascimento,
        local_nascimento: student.local_nascimento,
        estado_nascimento: student.estado_nascimento,
        nome_pai: student.nome_pai,
        nome_mae: student.nome_mae,
        telefone: student.telefone,
        email: student.email?.replace("\\@", "@"),
        cpf: student.cpf,
        rg: student.rg,
        titulo_eleitoral: student.titulo_eleitoral,
        endereco: student.endereco,
        data_matricula: student.data_matricula || new Date().toISOString().split("T")[0],
        status: "Ativo",
      }));

      const { error: studentsError } = await supabase
        .from("students")
        .insert(studentsToInsert);

      if (studentsError) throw studentsError;

      setStep("success");
      toast.success(`Turma ${parsedData.turma.nome} criada com ${parsedData.students.length} alunos!`);
      
      setTimeout(() => {
        resetDialog();
        onSuccess?.();
      }, 2000);
    } catch (error: any) {
      console.error("Error importing:", error);
      toast.error(error.message || "Erro ao importar dados");
      setStep("preview");
    }
  };

  const resetDialog = () => {
    setSelectedFile(null);
    setParsedData(null);
    setStep("upload");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !isLoading && onOpenChange(open)}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importar Livro de Matrícula"}
            {step === "preview" && "Confirmar Importação"}
            {step === "importing" && "Importando..."}
            {step === "success" && "Importação Concluída"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Faça upload do PDF do Livro de Matrícula para criar a turma e importar os alunos automaticamente."}
            {step === "preview" && "Verifique os dados extraídos antes de confirmar a importação."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
                isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                selectedFile && "border-primary bg-primary/5"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                  <div>
                    <p className="font-medium">Importar Livro de Matrícula</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Arraste e solte um arquivo PDF ou clique para selecionar
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleParsePdf} 
                disabled={!selectedFile || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Processar PDF"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && parsedData && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-lg">{parsedData.turma.nome}</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Turno:</span>{" "}
                  {parsedData.turma.turno || "Não informado"}
                </div>
                <div>
                  <span className="text-muted-foreground">Curso:</span>{" "}
                  {parsedData.turma.curso || "Não informado"}
                </div>
                <div>
                  <span className="text-muted-foreground">Início:</span>{" "}
                  {parsedData.turma.data_inicio 
                    ? new Date(parsedData.turma.data_inicio).toLocaleDateString("pt-BR")
                    : "Não informado"}
                </div>
                <div>
                  <span className="text-muted-foreground">Alunos:</span>{" "}
                  {parsedData.students.length}
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Lista de Alunos
              </h4>
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {parsedData.students.map((student, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-muted/30 text-sm"
                    >
                      <span className="font-medium">{student.nome}</span>
                      <span className="text-muted-foreground text-xs">
                        {student.matricula}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={handleImport}>
                Confirmar Importação
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <p className="text-muted-foreground">Importando turma e alunos...</p>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <p className="font-medium">Importação concluída com sucesso!</p>
            <p className="text-sm text-muted-foreground">
              A turma e os alunos foram adicionados ao sistema.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
