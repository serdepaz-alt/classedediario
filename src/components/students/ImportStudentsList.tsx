import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportStudentsListProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export const ImportStudentsList = ({ onCancel, onSuccess }: ImportStudentsListProps) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("turmas")
        .select("*")
        .eq("user_id", user.id)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

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
    if (file) validateAndSetFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const validTypes = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    
    if (!validTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use PDF, Excel ou CSV.");
      return;
    }

    setSelectedFile(file);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Selecione um arquivo para importar");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Implement file parsing logic
      // For now, show a message that this feature is in development
      toast.info("Funcionalidade de importação em desenvolvimento. Por favor, adicione estudantes individualmente.");
      onCancel();
    } catch (error: any) {
      toast.error(error.message || "Erro ao importar estudantes");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          selectedFile && "border-success bg-success/5"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
        />

        {selectedFile ? (
          <div className="space-y-2">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-success" />
            <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
              }}
            >
              Remover Arquivo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Importar Lista de Estudantes</p>
              <p className="text-sm text-muted-foreground mt-1">
                Arraste e solte um arquivo PDF, Excel ou CSV
              </p>
            </div>
            <Button type="button" variant="outline" size="sm">
              Selecionar Arquivo
            </Button>
          </div>
        )}
      </div>

      {/* Associate to Class */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Associar à Turma
        </h3>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <Select value={selectedTurma} onValueChange={setSelectedTurma}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma turma (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome} - {turma.ano_letivo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {turmas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma turma cadastrada. Você pode adicionar estudantes sem turma.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleImport} disabled={isLoading || !selectedFile}>
          {isLoading ? "Importando..." : "Importar Estudantes"}
        </Button>
      </div>
    </div>
  );
};
