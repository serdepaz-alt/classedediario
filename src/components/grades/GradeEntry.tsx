import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Lock, 
  Unlock, 
  Send, 
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useGrades } from "@/hooks/useGrades";

interface GradeRow {
  id?: string; // DB id if exists
  numero_avaliacao: number;
  nome_avaliacao: string;
  peso: number;
  valor: number | null;
  is_locked: boolean;
  bonus: number;
  notificacao_status: string;
}

interface StudentItem {
  id: string;
  nome: string;
  matricula: string;
}

interface GradeEntryProps {
  onBack: () => void;
  turmaId: string;
  disciplinaId: string;
  turmaNome: string;
  disciplinaNome: string;
}

export const GradeEntry = ({ onBack, turmaId, disciplinaId, turmaNome, disciplinaNome }: GradeEntryProps) => {
  const { fetchStudents, fetchStudentGrades, saveGrade } = useGrades();
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [bonusGrade, setBonusGrade] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<"prev" | "next" | number | null>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load students
  useEffect(() => {
    const load = async () => {
      setLoadingStudents(true);
      const data = await fetchStudents(turmaId);
      setStudents(data);
      setLoadingStudents(false);
    };
    load();
  }, [turmaId]);

  const filteredStudents = students.filter(s =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedStudent = filteredStudents[selectedStudentIndex] || filteredStudents[0];

  // Load grades when student changes
  const loadGrades = useCallback(async (studentId: string) => {
    setLoadingGrades(true);
    const data = await fetchStudentGrades(studentId, disciplinaId);
    
    if (data.length > 0) {
      setGrades(data.map(n => ({
        id: n.id,
        numero_avaliacao: n.numero_avaliacao,
        nome_avaliacao: n.nome_avaliacao,
        peso: n.peso,
        valor: n.valor,
        is_locked: n.is_locked,
        bonus: n.bonus || 0,
        notificacao_status: n.notificacao_status,
      })));
      // Use bonus from first record
      setBonusGrade(data[0]?.bonus || 0);
    } else {
      // Default 3 evaluations
      setGrades([
        { numero_avaliacao: 1, nome_avaliacao: "AVALIAÇÃO 1", peso: 1, valor: null, is_locked: false, bonus: 0, notificacao_status: "Não Enviado" },
        { numero_avaliacao: 2, nome_avaliacao: "AVALIAÇÃO 2", peso: 1, valor: null, is_locked: false, bonus: 0, notificacao_status: "Não Enviado" },
        { numero_avaliacao: 3, nome_avaliacao: "AVALIAÇÃO 3", peso: 1, valor: null, is_locked: false, bonus: 0, notificacao_status: "Não Enviado" },
      ]);
      setBonusGrade(0);
    }
    setHasUnsavedChanges(false);
    setLoadingGrades(false);
  }, [disciplinaId, fetchStudentGrades]);

  useEffect(() => {
    if (selectedStudent?.id) {
      loadGrades(selectedStudent.id);
    }
  }, [selectedStudent?.id, loadGrades]);

  // Calculate partial average (only locked grades count)
  const calculatePartialAverage = () => {
    const lockedGrades = grades.filter(g => g.is_locked && g.valor !== null);
    if (lockedGrades.length === 0) return 0;
    
    const totalWeight = lockedGrades.reduce((sum, g) => sum + g.peso, 0);
    const weightedSum = lockedGrades.reduce((sum, g) => sum + (g.valor || 0) * g.peso, 0);
    
    return (weightedSum + bonusGrade) / totalWeight;
  };

  // Calculate final average (ALL grades with values)
  const calculateFinalAverage = () => {
    const allWithValues = grades.filter(g => g.valor !== null);
    if (allWithValues.length === 0) return 0;
    
    const totalWeight = allWithValues.reduce((sum, g) => sum + g.peso, 0);
    const weightedSum = allWithValues.reduce((sum, g) => sum + (g.valor || 0) * g.peso, 0);
    
    return (weightedSum + bonusGrade) / totalWeight;
  };

  const partialAverage = calculatePartialAverage();
  const finalAverage = calculateFinalAverage();
  const lockedGradesCount = grades.filter(g => g.is_locked && g.valor !== null).length;
  const allGradesCount = grades.filter(g => g.valor !== null).length;
  const allLocked = grades.length > 0 && grades.every(g => g.is_locked);
  const finalStatus = allLocked 
    ? (finalAverage >= 7.0 ? "Aprovado" : finalAverage >= 5.0 ? "Recuperação" : "Reprovado")
    : null;

  const handleGradeChange = (index: number, value: string) => {
    if (grades[index]?.is_locked) {
      toast.info("Nota travada. Para alterar, solicite a modificação ao setor administrativo.");
      return;
    }
    const numValue = value === "" ? null : parseFloat(value);
    setGrades(prev => prev.map((g, i) => 
      i === index ? { ...g, valor: numValue, notificacao_status: "Não Enviado" } : g
    ));
    setHasUnsavedChanges(true);
  };

  const handleToggleLock = (index: number) => {
    const grade = grades[index];
    if (grade?.is_locked) {
      toast.info("Nota já travada. Para destravá-la, solicite a modificação ao setor administrativo.");
      return;
    }
    setGrades(prev => prev.map((g, i) => 
      i === index ? { ...g, is_locked: true } : g
    ));
    setHasUnsavedChanges(true);
  };

  const handleAddEvaluation = () => {
    const nextNum = grades.length > 0 ? Math.max(...grades.map(g => g.numero_avaliacao)) + 1 : 1;
    setGrades(prev => [...prev, {
      numero_avaliacao: nextNum,
      nome_avaliacao: `AVALIAÇÃO ${nextNum}`,
      peso: 1,
      valor: null,
      is_locked: false,
      bonus: 0,
      notificacao_status: "Não Enviado",
    }]);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    setSaving(true);

    try {
      for (const grade of grades) {
        const result = await saveGrade({
          studentId: selectedStudent.id,
          disciplinaId,
          numeroAvaliacao: grade.numero_avaliacao,
          nomeAvaliacao: grade.nome_avaliacao,
          peso: grade.peso,
          valor: grade.valor,
          isLocked: grade.is_locked,
          bonus: bonusGrade,
          existingId: grade.id,
        });

        if (result?.error) {
          toast.error(`Erro ao salvar: ${result.error.message}`);
          setSaving(false);
          return;
        }

        // Update local id if it was a new insert
        if (result?.data && !grade.id) {
          grade.id = result.data.id;
        }
      }

      toast.success("Notas salvas com sucesso!");
      setHasUnsavedChanges(false);
      // Reload to get fresh ids
      await loadGrades(selectedStudent.id);
    } catch (err) {
      toast.error("Erro inesperado ao salvar notas.");
    }
    setSaving(false);
  };

  const handleNavigate = (direction: "prev" | "next") => {
    if (hasUnsavedChanges) {
      setPendingNavigation(direction);
      setShowUnsavedDialog(true);
      return;
    }
    executeNavigation(direction);
  };

  const executeNavigation = (direction: "prev" | "next" | number) => {
    if (typeof direction === "number") {
      setSelectedStudentIndex(direction);
    } else if (direction === "prev" && selectedStudentIndex > 0) {
      setSelectedStudentIndex(prev => prev - 1);
    } else if (direction === "next" && selectedStudentIndex < filteredStudents.length - 1) {
      setSelectedStudentIndex(prev => prev + 1);
    }
    setHasUnsavedChanges(false);
    setPendingNavigation(null);
  };

  const handleSaveAndNext = async () => {
    await handleSave();
    if (selectedStudentIndex < filteredStudents.length - 1) {
      setSelectedStudentIndex(prev => prev + 1);
    }
  };

  const handleSelectStudent = (index: number) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(index);
      setShowUnsavedDialog(true);
      return;
    }
    setSelectedStudentIndex(index);
  };

  const confirmNavigation = async () => {
    await handleSave();
    if (pendingNavigation !== null) {
      executeNavigation(pendingNavigation as any);
    }
    setShowUnsavedDialog(false);
  };

  const discardAndNavigate = () => {
    if (pendingNavigation !== null) {
      executeNavigation(pendingNavigation as any);
    }
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
  };

  if (loadingStudents) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>Gestão de Notas</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">Lançamento ({turmaNome} - {disciplinaNome})</span>
            </div>
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">Nenhum aluno ativo encontrado nesta turma.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Student Selection */}
          <Card className="gradient-card shadow-card border-0 p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">SELEÇÃO ALUNO</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno por nome."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <p className="text-sm text-muted-foreground mb-3">Lista da Turma ({filteredStudents.length}):</p>

            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {filteredStudents.map((student, index) => (
                  <div
                    key={student.id}
                    onClick={() => handleSelectStudent(index)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      index === selectedStudentIndex
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index === selectedStudentIndex
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium block truncate">{student.nome}</span>
                      <span className={`text-xs ${index === selectedStudentIndex ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        Mat: {student.matricula}
                      </span>
                    </div>
                    {index === selectedStudentIndex && (
                      <ChevronRight className="w-4 h-4 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Right Column - Grade Entry */}
          <Card className="gradient-card shadow-card border-0 p-6">
            {selectedStudent && (
              <>
                {loadingGrades ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Student Header */}
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {selectedStudent.nome.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground uppercase">{selectedStudent.nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          Matrícula: {selectedStudent.matricula}
                        </p>
                      </div>
                    </div>

                    {/* Grades Section */}
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">NOTAS INTERMEDIÁRIAS (AVALIAÇÕES)</h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          *Use o cadeado para definir se a nota compõe a média final.*
                        </p>
                      </div>

                      {grades.map((grade, index) => (
                        <div key={index} className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <span className="text-sm font-medium">{grade.nome_avaliacao}</span>
                            <span className="text-xs text-muted-foreground">(Peso {grade.peso})</span>
                          </div>
                          
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="10"
                            placeholder="Nota"
                            value={grade.valor ?? ""}
                            onChange={(e) => handleGradeChange(index, e.target.value)}
                            className={`w-20 ${grade.is_locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                            readOnly={grade.is_locked}
                            onClick={() => grade.is_locked && toast.info("Nota travada. Para alterar, solicite a modificação ao setor administrativo.")}
                          />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleLock(index)}
                            className={`gap-1 ${grade.is_locked ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            {grade.is_locked ? (
                              <>
                                <Lock className="w-4 h-4" />
                                <span className="text-xs">Travado</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-4 h-4" />
                                <span className="text-xs">Destravado</span>
                              </>
                            )}
                          </Button>

                          <div className="flex items-center gap-1 ml-auto">
                            {grade.notificacao_status === "Enviado" ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <Send className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">{grade.notificacao_status}</span>
                          </div>
                        </div>
                      ))}

                      {/* Add Evaluation + Bonus */}
                      <div className="flex items-center gap-3 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleAddEvaluation}
                          className="text-primary border-primary"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar Avaliação
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Bônus:</span>
                          <Input
                            type="number"
                            step="0.1"
                            value={bonusGrade}
                            onChange={(e) => { setBonusGrade(parseFloat(e.target.value) || 0); setHasUnsavedChanges(true); }}
                            className="w-16"
                          />
                        </div>
                      </div>

                      {/* Performance Summary */}
                      <div className="mt-6 pt-4 border-t space-y-3">
                        <h4 className="font-semibold text-foreground mb-2">RESUMO DO DESEMPENHO</h4>
                        <p className="text-lg">
                          <span className="font-bold">Média Parcial: {partialAverage.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({lockedGradesCount} avaliação{lockedGradesCount !== 1 ? "ões" : ""} travada{lockedGradesCount !== 1 ? "s" : ""})
                          </span>
                        </p>
                        <div className={`p-3 rounded-lg ${
                          finalStatus === "Aprovado" ? "bg-success/10 border border-success/30" :
                          finalStatus === "Recuperação" ? "bg-warning/10 border border-warning/30" :
                          finalStatus === "Reprovado" ? "bg-destructive/10 border border-destructive/30" :
                          "bg-muted/30 border border-border"
                        }`}>
                          <p className="text-xl font-bold">
                            Média Final: {allGradesCount > 0 ? finalAverage.toFixed(1) : "—"}
                          </p>
                          {finalStatus && (
                            <span className={`text-sm font-semibold ${
                              finalStatus === "Aprovado" ? "text-success" :
                              finalStatus === "Recuperação" ? "text-warning" :
                              "text-destructive"
                            }`}>
                              Situação: {finalStatus}
                            </span>
                          )}
                          {!allLocked && allGradesCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              * Trave todas as avaliações para definir a situação final.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <Button 
                        variant="ghost" 
                        onClick={() => handleNavigate("prev")}
                        disabled={selectedStudentIndex === 0}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      
                      <Button variant="outline" onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Salvar
                      </Button>
                      
                      <Button 
                        className="bg-primary hover:bg-primary/90"
                        onClick={handleSaveAndNext}
                        disabled={selectedStudentIndex === filteredStudents.length - 1 || saving}
                      >
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                        Salvar e Próximo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}
          </Card>
        </div>
      )}

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja salvar antes de prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={discardAndNavigate}>Descartar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNavigation}>Salvar e Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
