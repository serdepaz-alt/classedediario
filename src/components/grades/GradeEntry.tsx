import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Lock, 
  Unlock, 
  Check,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  ArrowLeft,
  Loader2,
  Edit2,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Send,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useGrades } from "@/hooks/useGrades";
import { supabase } from "@/integrations/supabase/client";

interface GradeRow {
  id?: string;
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
  gradeStatus?: "complete" | "partial" | "none" | "risk";
}

interface GradeEntryProps {
  onBack: () => void;
  turmaId: string;
  disciplinaId: string;
  turmaNome: string;
  disciplinaNome: string;
}

interface BatchGradeRow {
  studentId: string;
  studentName: string;
  valor: number | null;
  existingId?: string;
  is_locked: boolean;
}

// Available evaluations
const EVALUATION_OPTIONS = [
  "AVALIAÇÃO 1",
  "AVALIAÇÃO 2",
  "AVALIAÇÃO 3",
  "AVALIAÇÃO 4",
  "AVALIAÇÃO 5",
  "PROVA PRÁTICA",
  "TRABALHO",
  "SEMINÁRIO",
  "RECUPERAÇÃO",
];

export const GradeEntry = ({ onBack, turmaId, disciplinaId, turmaNome, disciplinaNome }: GradeEntryProps) => {
  const { fetchStudents, fetchStudentGrades, saveGrade } = useGrades();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Batch mode is now the default and primary mode
  const [batchEvaluationName, setBatchEvaluationName] = useState("AVALIAÇÃO 1");
  const [batchGrades, setBatchGrades] = useState<BatchGradeRow[]>([]);
  const [savingBatch, setSavingBatch] = useState(false);
  const [batchSaved, setBatchSaved] = useState(false);

  // Confirmation dialog
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Individual mode state (kept for secondary access)
  const [entryMode, setEntryMode] = useState<"batch" | "individual">("batch");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);
  const [grades, setGrades] = useState<GradeRow[]>([]);
  const [bonusGrade, setBonusGrade] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<"prev" | "next" | number | null>(null);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit evaluation name dialog
  const [editingEvalIndex, setEditingEvalIndex] = useState<number | null>(null);
  const [editEvalName, setEditEvalName] = useState("");
  const [editEvalPeso, setEditEvalPeso] = useState(1);

  // Save summary dialog (individual)
  const [showSaveSummary, setShowSaveSummary] = useState(false);
  const [saveSummaryData, setSaveSummaryData] = useState<{
    studentName: string;
    average: number;
    grades: GradeRow[];
    distribution: { range: string; count: number }[];
  } | null>(null);

  // Load students
  useEffect(() => {
    const load = async () => {
      setLoadingStudents(true);
      const data = await fetchStudents(turmaId);
      
      const studentsWithStatus: StudentItem[] = [];
      for (const s of data) {
        const gradeData = await fetchStudentGrades(s.id, disciplinaId);
        let gradeStatus: "complete" | "partial" | "none" | "risk" = "none";
        
        if (gradeData.length > 0) {
          const allLocked = gradeData.every(g => g.is_locked);
          const hasValues = gradeData.some(g => g.valor !== null);
          const avg = gradeData.filter(g => g.valor !== null).length > 0
            ? gradeData.filter(g => g.valor !== null).reduce((sum, g) => sum + (g.valor || 0), 0) / gradeData.filter(g => g.valor !== null).length
            : 0;

          if (allLocked && hasValues) {
            gradeStatus = avg < 5.0 ? "risk" : "complete";
          } else if (hasValues) {
            gradeStatus = avg < 5.0 ? "risk" : "partial";
          }
        }

        studentsWithStatus.push({ ...s, gradeStatus });
      }

      setStudents(studentsWithStatus);
      setLoadingStudents(false);
    };
    load();
  }, [turmaId, disciplinaId]);

  // Initialize batch grades when students load or evaluation changes
  useEffect(() => {
    if (entryMode === "batch" && students.length > 0) {
      loadBatchGrades();
    }
  }, [entryMode, students, batchEvaluationName]);

  const loadBatchGrades = async () => {
    const rows: BatchGradeRow[] = [];
    for (const s of students) {
      const existingGrades = await fetchStudentGrades(s.id, disciplinaId);
      const matching = existingGrades.find(g => g.nome_avaliacao === batchEvaluationName);
      rows.push({
        studentId: s.id,
        studentName: s.nome,
        valor: matching?.valor ?? null,
        existingId: matching?.id,
        is_locked: matching?.is_locked ?? false,
      });
    }
    setBatchGrades(rows);
    setBatchSaved(false);
  };

  // Progress tracking
  const filledCount = batchGrades.filter(g => g.valor !== null).length;
  const totalCount = batchGrades.length;
  const progressPercent = totalCount > 0 ? (filledCount / totalCount) * 100 : 0;

  // Batch save
  const handleBatchSave = async () => {
    setSavingBatch(true);
    let count = 0;

    try {
      for (const bg of batchGrades) {
        if (bg.valor === null) continue;

        // Determine evaluation number from name
        const numMatch = batchEvaluationName.match(/\d+/);
        const evalNum = numMatch ? parseInt(numMatch[0]) : 1;

        const result = await saveGrade({
          studentId: bg.studentId,
          disciplinaId,
          numeroAvaliacao: evalNum,
          nomeAvaliacao: batchEvaluationName,
          peso: 1,
          valor: bg.valor,
          isLocked: true,
          bonus: 0,
          existingId: bg.existingId,
        });

        if (!result?.error) count++;
      }

      setSavedCount(count);
      setBatchSaved(true);
      setBatchGrades(prev => prev.map(bg => bg.valor !== null ? { ...bg, is_locked: true } : bg));
      setShowConfirmation(true);
    } catch (err) {
      toast.error("Erro ao salvar notas em lote.");
    }

    setSavingBatch(false);
  };

  // After confirmation, redirect back to selector
  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    onBack();
  };

  // Toggle lock for a batch grade
  const handleBatchToggleLock = (idx: number) => {
    const bg = batchGrades[idx];
    if (bg.is_locked) {
      toast.info("Nota já travada. Para destravá-la, solicite ao setor administrativo.");
      return;
    }
    if (bg.valor === null) {
      toast.info("Insira uma nota antes de travar.");
      return;
    }
    setBatchGrades(prev => prev.map((g, i) => i === idx ? { ...g, is_locked: true } : g));
  };

  // === Individual mode functions ===
  const filteredStudents = students.filter(s =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedStudent = filteredStudents[selectedStudentIndex] || filteredStudents[0];

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
      setBonusGrade(data[0]?.bonus || 0);
    } else {
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
    if (selectedStudent?.id && entryMode === "individual") {
      loadGrades(selectedStudent.id);
    }
  }, [selectedStudent?.id, loadGrades, entryMode]);

  const calculatePartialAverage = () => {
    const lockedGrades = grades.filter(g => g.is_locked && g.valor !== null);
    if (lockedGrades.length === 0) return bonusGrade > 0 ? bonusGrade : 0;
    const totalWeight = lockedGrades.reduce((sum, g) => sum + g.peso, 0);
    const weightedSum = lockedGrades.reduce((sum, g) => sum + (g.valor || 0) * g.peso, 0);
    return totalWeight > 0 ? (weightedSum / totalWeight) + bonusGrade : 0;
  };

  const calculateFinalAverage = () => {
    const allWithValues = grades.filter(g => g.valor !== null);
    if (allWithValues.length === 0) return bonusGrade > 0 ? bonusGrade : 0;
    const totalWeight = allWithValues.reduce((sum, g) => sum + g.peso, 0);
    const weightedSum = allWithValues.reduce((sum, g) => sum + (g.valor || 0) * g.peso, 0);
    return totalWeight > 0 ? (weightedSum / totalWeight) + bonusGrade : 0;
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

  const handleEditEvaluation = (index: number) => {
    setEditingEvalIndex(index);
    setEditEvalName(grades[index].nome_avaliacao);
    setEditEvalPeso(grades[index].peso);
  };

  const saveEvaluationEdit = () => {
    if (editingEvalIndex !== null) {
      setGrades(prev => prev.map((g, i) => 
        i === editingEvalIndex ? { ...g, nome_avaliacao: editEvalName, peso: editEvalPeso } : g
      ));
      setHasUnsavedChanges(true);
      setEditingEvalIndex(null);
    }
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

        if (result?.data && !grade.id) {
          grade.id = result.data.id;
        }
      }

      toast.success("Notas salvas com sucesso!");
      setHasUnsavedChanges(false);

      const currentFinalAvg = calculateFinalAverage();
      const currentPartialAvg = calculatePartialAverage();
      const currentLockedCount = grades.filter(g => g.is_locked && g.valor !== null).length;
      const currentTotalCount = grades.filter(g => g.valor !== null).length;
      const currentAllLocked = grades.length > 0 && grades.every(g => g.is_locked);
      const currentSituacaoMedia = currentAllLocked
        ? (currentFinalAvg >= 7.0 ? "Aprovado" : currentFinalAvg >= 5.0 ? "Recuperação" : "Reprovado")
        : "Em Andamento";

      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        await supabase
          .from("medias_alunos" as any)
          .upsert({
            user_id: authData.user.id,
            student_id: selectedStudent.id,
            disciplina_id: disciplinaId,
            media_parcial: parseFloat(currentPartialAvg.toFixed(2)),
            media_final: parseFloat(currentFinalAvg.toFixed(2)),
            bonus: bonusGrade,
            situacao: currentSituacaoMedia,
            total_avaliacoes: currentTotalCount,
            avaliacoes_travadas: currentLockedCount,
            updated_at: new Date().toISOString(),
          } as any, { onConflict: "student_id,disciplina_id" } as any);
      }

      const gradeValues = grades.filter(g => g.valor !== null).map(g => g.valor!);
      const distribution = [
        { range: "9-10", count: gradeValues.filter(v => v >= 9).length },
        { range: "7-8.9", count: gradeValues.filter(v => v >= 7 && v < 9).length },
        { range: "5-6.9", count: gradeValues.filter(v => v >= 5 && v < 7).length },
        { range: "0-4.9", count: gradeValues.filter(v => v < 5).length },
      ];

      setSaveSummaryData({
        studentName: selectedStudent.nome,
        average: currentFinalAvg,
        grades: [...grades],
        distribution,
      });

      const lockedGradesWithValues = grades.filter(g => g.is_locked && g.valor !== null);
      if (lockedGradesWithValues.length > 0) {
        const { data: studentData } = await supabase
          .from("students")
          .select("email")
          .eq("id", selectedStudent.id)
          .single();

        if (studentData?.email) {
          try {
            await supabase.functions.invoke("send-grade-notifications", {
              body: {
                student_id: selectedStudent.id,
                student_name: selectedStudent.nome,
                student_email: studentData.email,
                disciplina_nome: disciplinaNome,
                turma_nome: turmaNome,
                professor_nome: "Professor(a)",
                grades: grades.map(g => ({
                  nome_avaliacao: g.nome_avaliacao,
                  valor: g.valor,
                  peso: g.peso,
                  is_locked: g.is_locked,
                })),
                media_final: currentFinalAvg,
                bonus: bonusGrade,
                situacao: currentSituacaoMedia,
              },
            });
          } catch (emailErr) {
            console.error("Erro ao enviar email:", emailErr);
          }
        }
      }

      const avg = currentFinalAvg;
      setStudents(prev => prev.map(s => 
        s.id === selectedStudent.id
          ? { ...s, gradeStatus: currentAllLocked ? (avg < 5.0 ? "risk" : "complete") : (currentTotalCount > 0 ? (avg < 5.0 ? "risk" : "partial") : "none") as any }
          : s
      ));

      setShowSaveSummary(true);
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
    setTimeout(() => {
      setShowSaveSummary(false);
      if (selectedStudentIndex < filteredStudents.length - 1) {
        setSelectedStudentIndex(prev => prev + 1);
      }
    }, 1500);
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

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "partial":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "risk":
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  if (loadingStudents) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <span>Gestão de Notas</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground font-medium">
                {turmaNome} — {disciplinaNome}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={entryMode === "batch" ? "default" : "outline"}
            size="sm"
            onClick={() => setEntryMode("batch")}
          >
            <Users className="w-4 h-4 mr-1" />
            Em Lote
          </Button>
          <Button
            variant={entryMode === "individual" ? "default" : "outline"}
            size="sm"
            onClick={() => setEntryMode("individual")}
          >
            Individual
          </Button>
        </div>
      </div>

      {students.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-muted-foreground">Nenhum aluno ativo encontrado nesta turma.</p>
        </Card>
      ) : entryMode === "batch" ? (
        /* ========== BATCH MODE (DEFAULT) ========== */
        <Card className="gradient-card shadow-card border-0 p-6">
          {/* Progress bar and counter at top */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-foreground">Lançamento em Lote</h3>
              <span className="text-sm font-medium text-muted-foreground">
                {filledCount} de {totalCount} preenchidas
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Evaluation dropdown selector - no Peso, no Nº */}
          <div className="flex items-center gap-4 mb-6">
            <span className="text-sm font-medium text-foreground">Avaliação:</span>
            <Select value={batchEvaluationName} onValueChange={setBatchEvaluationName}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVALUATION_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {batchGrades.map((bg, idx) => (
                <div key={bg.studentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <span className="text-sm text-muted-foreground w-6 text-right">{idx + 1}</span>
                  <span className="flex-1 font-medium text-sm truncate">{bg.studentName}</span>
                  
                  <Input
                    id={`batch-nota-${idx}`}
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    placeholder="Nota"
                    value={bg.valor ?? ""}
                    onChange={(e) => {
                      if (bg.is_locked) {
                        toast.info("Nota travada.");
                        return;
                      }
                      const val = e.target.value === "" ? null : parseFloat(e.target.value);
                      setBatchGrades(prev => prev.map((g, i) => i === idx ? { ...g, valor: val } : g));
                      setBatchSaved(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Tab") {
                        e.preventDefault();
                        // Find next unlocked input
                        for (let next = idx + 1; next < batchGrades.length; next++) {
                          if (!batchGrades[next].is_locked) {
                            const nextInput = document.getElementById(`batch-nota-${next}`);
                            if (nextInput) {
                              nextInput.focus();
                              (nextInput as HTMLInputElement).select();
                            }
                            break;
                          }
                        }
                      }
                    }}
                    className={`w-20 ${bg.is_locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                    readOnly={bg.is_locked}
                  />

                  {/* Colored lock: red = locked, green = open */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleBatchToggleLock(idx)}
                    className="p-1 h-8 w-8"
                  >
                    {bg.is_locked ? (
                      <Lock className="w-4 h-4 text-red-500" />
                    ) : (
                      <Unlock className="w-4 h-4 text-green-500" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Save button: white and disabled after save */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleBatchSave}
              disabled={savingBatch || batchSaved || filledCount === 0}
              variant={batchSaved ? "outline" : "default"}
              className={batchSaved ? "bg-background text-muted-foreground border cursor-not-allowed" : ""}
            >
              {savingBatch ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : batchSaved ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {batchSaved ? "Notas Salvas" : `Salvar Lote (${filledCount} notas)`}
            </Button>
          </div>
        </Card>
      ) : (
        /* ========== INDIVIDUAL MODE ========== */
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
                    <div className="flex items-center gap-1">
                      {index !== selectedStudentIndex && getStatusIcon(student.gradeStatus)}
                      {index === selectedStudentIndex && (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      )}
                    </div>
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

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">NOTAS INTERMEDIÁRIAS (AVALIAÇÕES)</h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          *Use o cadeado para definir se a nota compõe a média final.*
                        </p>
                      </div>

                      {grades.map((grade, index) => (
                        <div key={index} className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1 min-w-[140px]">
                            <span className="text-sm font-medium truncate">{grade.nome_avaliacao}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleEditEvaluation(index)}
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
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
                            onClick={() => grade.is_locked && toast.info("Nota travada.")}
                          />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleLock(index)}
                            className="gap-1"
                          >
                            {grade.is_locked ? (
                              <><Lock className="w-4 h-4 text-red-500" /><span className="text-xs text-red-500">Travado</span></>
                            ) : (
                              <><Unlock className="w-4 h-4 text-green-500" /><span className="text-xs text-green-500">Aberto</span></>
                            )}
                          </Button>

                          <div className="flex items-center gap-1 ml-auto">
                            {grade.notificacao_status === "Enviado" ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Send className="w-4 h-4 text-muted-foreground" />
                            )}
                            <span className="text-xs text-muted-foreground">{grade.notificacao_status}</span>
                          </div>
                        </div>
                      ))}

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

                      <div className="mt-6 pt-4 border-t space-y-3">
                        <h4 className="font-semibold text-foreground mb-2">RESUMO DO DESEMPENHO</h4>
                        <p className="text-lg">
                          <span className="font-bold">Média Parcial: {partialAverage.toFixed(1)}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({lockedGradesCount} travada{lockedGradesCount !== 1 ? "s" : ""})
                          </span>
                        </p>
                        <div className={`p-3 rounded-lg ${
                          finalStatus === "Aprovado" ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800" :
                          finalStatus === "Recuperação" ? "bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800" :
                          finalStatus === "Reprovado" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" :
                          "bg-muted/30 border border-border"
                        }`}>
                          <p className="text-xl font-bold">
                            Média Final: {allGradesCount > 0 ? finalAverage.toFixed(1) : "—"}
                          </p>
                          {finalStatus && (
                            <span className={`text-sm font-semibold ${
                              finalStatus === "Aprovado" ? "text-green-600" :
                              finalStatus === "Recuperação" ? "text-yellow-600" :
                              "text-red-600"
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

      {/* Confirmation Dialog - centered message after batch save */}
      <Dialog open={showConfirmation} onOpenChange={() => {}}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground mb-1">Notas Salvas!</h3>
              <p className="text-muted-foreground text-sm">
                {savedCount} nota{savedCount !== 1 ? "s" : ""} de <strong>{batchEvaluationName}</strong> {savedCount !== 1 ? "foram salvas" : "foi salva"} e enviada{savedCount !== 1 ? "s" : ""} aos alunos com sucesso.
              </p>
            </div>
            <Button onClick={handleConfirmationClose} className="w-full mt-2">
              Voltar para Seleção
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Evaluation Dialog */}
      <Dialog open={editingEvalIndex !== null} onOpenChange={(open) => !open && setEditingEvalIndex(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Avaliação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Avaliação</label>
              <Input
                value={editEvalName}
                onChange={(e) => setEditEvalName(e.target.value)}
                placeholder="Ex: Prova Prática, Trabalho Final..."
              />
            </div>
            <div>
              <label className="text-sm font-medium">Peso</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={editEvalPeso}
                onChange={(e) => setEditEvalPeso(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvalIndex(null)}>Cancelar</Button>
            <Button onClick={saveEvaluationEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Summary Dialog (Individual) */}
      <Dialog open={showSaveSummary} onOpenChange={setShowSaveSummary}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Notas Salvas com Sucesso!
            </DialogTitle>
          </DialogHeader>
          {saveSummaryData && (
            <div className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-semibold">{saveSummaryData.studentName}</p>
                <p className="text-sm text-muted-foreground">{disciplinaNome} • {turmaNome}</p>
              </div>
              
              <div className="text-center">
                <p className="text-4xl font-bold text-primary">{saveSummaryData.average.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Média Final</p>
                <Badge className={`mt-2 ${
                  saveSummaryData.average >= 7.0 ? "bg-green-500" :
                  saveSummaryData.average >= 5.0 ? "bg-yellow-500" : "bg-red-500"
                }`}>
                  {saveSummaryData.average >= 7.0 ? "Aprovado" : saveSummaryData.average >= 5.0 ? "Recuperação" : "Reprovado"}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Distribuição das Notas</p>
                <div className="space-y-1">
                  {saveSummaryData.distribution.map(d => (
                    <div key={d.range} className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-12">{d.range}</span>
                      <div className="flex-1 h-4 bg-muted rounded-sm overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            d.range === "9-10" ? "bg-green-500" :
                            d.range === "7-8.9" ? "bg-blue-500" :
                            d.range === "5-6.9" ? "bg-yellow-500" : "bg-red-500"
                          }`}
                          style={{ width: `${saveSummaryData.grades.length > 0 ? (d.count / saveSummaryData.grades.length) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium w-4">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowSaveSummary(false)}>Concluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
