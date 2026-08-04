import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle, Users, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { extractTextFromPdf } from "@/lib/pdfExtractor";
import { Badge } from "@/components/ui/badge";

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
  const [expandedStudent, setExpandedStudent] = useState<number | null>(null);

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

  const handleParsePdf = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      // Extract text properly using pdf.js
      const extractedText = await extractTextFromPdf(selectedFile);

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error("Não foi possível extrair texto do PDF. O arquivo pode estar em formato de imagem.");
      }

      console.log("Extracted PDF text length:", extractedText.length);

      const { data, error } = await supabase.functions.invoke("parse-enrollment-pdf", {
        body: { pdfContent: extractedText },
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
      const turnoMap: Record<string, string> = {
        "Matutino": "Manhã",
        "Vespertino": "Tarde",
        "Noturno": "Noite",
        "Sábado": "Sábado",
      };

      // Reuse existing turma with the same name instead of creating a duplicate
      const { data: existingTurma } = await supabase
        .from("turmas")
        .select("id")
        .eq("user_id", user.id)
        .eq("nome", parsedData.turma.nome)
        .maybeSingle();

      let turmaId = existingTurma?.id as string | undefined;

      if (!turmaId) {
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
            data_inicio: parsedData.turma.data_inicio,
            status: "Ativa",
          })
          .select()
          .single();

        if (turmaError) throw turmaError;
        turmaId = turmaData.id;
      }

      // Deduplicate by matricula within the extracted list
      const uniqueStudents = Array.from(
        new Map(parsedData.students.map((s) => [s.matricula, s])).values()
      );

      const studentsToInsert = uniqueStudents.map((student) => ({
        user_id: user.id,
        turma_id: turmaId!,
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

      // Upsert avoids "duplicate key" when a student was already imported
      const { error: studentsError } = await supabase
        .from("students")
        .upsert(studentsToInsert, { onConflict: "user_id,matricula" });

      if (studentsError) throw studentsError;

      setStep("success");
      toast.success(
        `Turma ${parsedData.turma.nome} atualizada com ${studentsToInsert.length} alunos!`
      );

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
    setExpandedStudent(null);
    onOpenChange(false);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    try {
      return new Date(date + "T00:00:00").toLocaleDateString("pt-BR");
    } catch {
      return date;
    }
  };

  const StudentDetailRow = ({ label, value }: { label: string; value: string | null }) => {
    if (!value) return null;
    return (
      <div className="flex justify-between text-xs py-0.5">
        <span className="text-muted-foreground">{label}:</span>
        <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !isLoading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[650px]">
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
              <Button onClick={handleParsePdf} disabled={!selectedFile || isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Extraindo dados...
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
            {/* Turma info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{parsedData.turma.nome}</h3>
                <Badge variant="secondary">{parsedData.students.length} alunos</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Turno:</span>{" "}
                  {parsedData.turma.turno || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Curso:</span>{" "}
                  {parsedData.turma.curso || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Início:</span>{" "}
                  {formatDate(parsedData.turma.data_inicio)}
                </div>
              </div>
            </div>

            {/* Students list with expandable details */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Alunos Extraídos
              </h4>
              <ScrollArea className="h-[280px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {parsedData.students.map((student, index) => (
                    <div key={index} className="rounded border bg-card">
                      <button
                        className="w-full flex items-center justify-between p-2.5 text-sm hover:bg-muted/50 transition-colors"
                        onClick={() => setExpandedStudent(expandedStudent === index ? null : index)}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                          <span className="font-medium">{student.nome}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{student.matricula}</span>
                          {expandedStudent === index ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      {expandedStudent === index && (
                        <div className="px-4 pb-3 pt-1 border-t bg-muted/20 space-y-0.5">
                          <StudentDetailRow label="CPF" value={student.cpf} />
                          <StudentDetailRow label="RG" value={student.rg} />
                          <StudentDetailRow label="Nascimento" value={formatDate(student.data_nascimento)} />
                          <StudentDetailRow label="Local" value={[student.local_nascimento, student.estado_nascimento].filter(Boolean).join(", ")} />
                          <StudentDetailRow label="Pai" value={student.nome_pai} />
                          <StudentDetailRow label="Mãe" value={student.nome_mae} />
                          <StudentDetailRow label="Telefone" value={student.telefone} />
                          <StudentDetailRow label="Email" value={student.email} />
                          <StudentDetailRow label="Título" value={student.titulo_eleitoral} />
                          <StudentDetailRow label="Endereço" value={student.endereco} />
                          <StudentDetailRow label="Matrícula em" value={formatDate(student.data_matricula)} />
                        </div>
                      )}
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
