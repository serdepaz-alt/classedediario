import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, Search, Filter, BookOpen, Clock, FileText, Upload, Sparkles, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DocumentUploadSection } from "@/components/programmatic/DocumentUploadSection";
import { ImportPdfConteudoDialog, AulaGerada } from "@/components/programmatic/ImportPdfConteudoDialog";
import { useConteudoProgramaticoAulas, AulaProgramatica } from "@/hooks/useConteudoProgramaticoAulas";
import { usePadroesDisciplinas } from "@/hooks/usePadroesDisciplinas";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { EditAulaDialog } from "@/components/programmatic/EditAulaDialog";
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

const statusMap = {
  planejado: { label: "Planejado", variant: "secondary" as const },
  concluido: { label: "Concluído", variant: "default" as const },
  cancelado: { label: "Cancelado", variant: "destructive" as const }
};

export const ProgrammaticContent = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { padroes: padroesDisciplinas, isLoading: isLoadingPadroes } = usePadroesDisciplinas();
  const [deletingPadrao, setDeletingPadrao] = useState<{ nome: string; count: number } | null>(null);
  const [isDeletingAulas, setIsDeletingAulas] = useState(false);
  
  // Extrair nomes únicos de disciplinas dos padrões
  const subjects = padroesDisciplinas.map(p => p.nome);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportPdfOpen, setIsImportPdfOpen] = useState(false);
  const { aulas: aulasSalvas, isLoading: isLoadingAulas, salvarAulasImportadas, deleteAula } = useConteudoProgramaticoAulas();
  const [editingAula, setEditingAula] = useState<AulaProgramatica | null>(null);
  const [deletingAula, setDeletingAula] = useState<AulaProgramatica | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [newContent, setNewContent] = useState({
    subject: "",
    topic: "",
    objectives: "",
    content: "",
    methodology: "",
    resources: "",
    assessment: "",
    duration: "",
    status: "planejado"
  });

  // Filtrar aulas salvas
  const filteredAulas = aulasSalvas.filter(aula => {
    const matchesSearch = aula.topico.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (aula.objetivo || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === "all" || aula.disciplina_nome === selectedSubject;
    const matchesStatus = selectedStatus === "all" || aula.status === selectedStatus;
    
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const handleAddContent = () => {
    console.log("Novo conteúdo:", { ...newContent, date: selectedDate });
    setIsAddDialogOpen(false);
    setNewContent({
      subject: "",
      topic: "",
      objectives: "",
      content: "",
      methodology: "",
      resources: "",
      assessment: "",
      duration: "",
      status: "planejado"
    });
    setSelectedDate(undefined);
  };

  const handleImportComplete = (aulas: AulaGerada[], disciplinaNome: string, disciplinaId?: string, turmaId?: string) => {
    salvarAulasImportadas.mutate({
      aulasData: aulas,
      disciplinaId,
      turmaId,
      disciplinaNome,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Conteúdo Programático</h1>
          <p className="text-muted-foreground">
            Registre e organize o conteúdo programático das disciplinas por data
          </p>
        </div>
      </div>

      {/* Tabs para Registros e Documentos */}
      <Tabs defaultValue="registros" className="w-full">
        <TabsList>
          <TabsTrigger value="registros" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Registros de Aula
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2">
            <FileText className="w-4 h-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registros" className="mt-6 space-y-6">
          {/* Padrões de Disciplinas - Summary */}
          {padroesDisciplinas.length > 0 && (
            <Card className="gradient-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Disciplinas do Padrão de Marcação ({padroesDisciplinas.length})
                </CardTitle>
                <CardDescription>Disciplinas configuradas para carga de dados</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                  {padroesDisciplinas.map((padrao) => (
                    <Badge
                      key={padrao.id}
                      variant="outline"
                      className="group gap-1 pr-1 hover:bg-primary/10"
                    >
                      <span
                        className="cursor-pointer"
                        onClick={() => setSelectedSubject(padrao.nome)}
                      >
                        {padrao.nome}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ({padrao.carga_horaria_total}h)
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const count = aulasSalvas.filter(
                            (a) => a.disciplina_nome === padrao.nome,
                          ).length;
                          setDeletingPadrao({ nome: padrao.nome, count });
                        }}
                        className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Excluir ${padrao.nome}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Button */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setIsImportPdfOpen(true)}>
              <Upload className="w-4 h-4" />
              Importar PDF com IA
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Novo Registro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Conteúdo Programático</DialogTitle>
                  <DialogDescription>
                    Adicione um novo registro de conteúdo programático da disciplina
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Data da Aula</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Disciplina</Label>
                      <Select value={newContent.subject} onValueChange={(value) => setNewContent({...newContent, subject: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a disciplina" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map(subject => (
                            <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="topic">Tópico da Aula</Label>
                      <Input
                        id="topic"
                        value={newContent.topic}
                        onChange={(e) => setNewContent({...newContent, topic: e.target.value})}
                        placeholder="Ex: Frações Decimais"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="duration">Duração (min)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newContent.duration}
                        onChange={(e) => setNewContent({...newContent, duration: e.target.value})}
                        placeholder="50"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="objectives">Objetivos</Label>
                    <Textarea
                      id="objectives"
                      value={newContent.objectives}
                      onChange={(e) => setNewContent({...newContent, objectives: e.target.value})}
                      placeholder="Descreva os objetivos da aula..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="content">Conteúdo</Label>
                    <Textarea
                      id="content"
                      value={newContent.content}
                      onChange={(e) => setNewContent({...newContent, content: e.target.value})}
                      placeholder="Descreva o conteúdo que será abordado..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="methodology">Metodologia</Label>
                    <Textarea
                      id="methodology"
                      value={newContent.methodology}
                      onChange={(e) => setNewContent({...newContent, methodology: e.target.value})}
                      placeholder="Descreva a metodologia utilizada..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="resources">Recursos</Label>
                      <Input
                        id="resources"
                        value={newContent.resources}
                        onChange={(e) => setNewContent({...newContent, resources: e.target.value})}
                        placeholder="Ex: Quadro, livro, jogos..."
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="assessment">Avaliação</Label>
                      <Input
                        id="assessment"
                        value={newContent.assessment}
                        onChange={(e) => setNewContent({...newContent, assessment: e.target.value})}
                        placeholder="Ex: Exercícios, participação..."
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddContent}>
                    Salvar Registro
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Filters */}
          <Card className="gradient-card">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Buscar por tópico ou conteúdo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Disciplinas</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="planejado">Planejado</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Aulas salvas (com filtro) */}
          {filteredAulas.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Plano de Aulas ({filteredAulas.length})
              </h2>
              <div className="grid gap-3">
                {filteredAulas.map((aula) => (
                  <Card key={aula.id} className="gradient-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-semibold flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-primary" />
                            {aula.topico}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <CalendarIcon className="w-3 h-3" /> {aula.data_aula}
                            <Badge variant="outline" className="ml-2 text-[10px]">{aula.disciplina_nome}</Badge>
                          </p>
                        </div>
                        <Badge variant={aula.tipo_avaliacao === "avaliacao" ? "destructive" : aula.tipo_avaliacao === "revisao" ? "secondary" : "default"}>
                          {aula.tipo_avaliacao === "avaliacao" ? "Avaliação" : aula.tipo_avaliacao === "revisao" ? "Revisão" : "Aula"}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-3">
                        <div>
                          <h5 className="font-medium text-foreground">Objetivo:</h5>
                          <p className="text-muted-foreground">{aula.objetivo}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-foreground">Metodologia:</h5>
                          <p className="text-muted-foreground">{aula.metodologia}</p>
                        </div>
                        <div>
                          <h5 className="font-medium text-foreground">Recursos:</h5>
                          <p className="text-muted-foreground">{aula.recursos}</p>
                        </div>
                      </div>
                      {aula.observacoes && (
                        <p className="text-xs text-muted-foreground italic mt-2">💡 {aula.observacoes}</p>
                      )}
                      <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
                        <Button variant="outline" size="sm" onClick={() => setEditingAula(aula)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeletingAula(aula)}>
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {filteredAulas.length === 0 && (
            <Card className="gradient-card">
              <CardContent className="text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum registro encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Não há registros de conteúdo programático. Importe um PDF ou crie manualmente.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => setIsImportPdfOpen(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Importar PDF com IA
                  </Button>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    Criar Registro
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documentos" className="mt-6">
          <DocumentUploadSection />
        </TabsContent>
      </Tabs>

      <ImportPdfConteudoDialog
        open={isImportPdfOpen}
        onOpenChange={setIsImportPdfOpen}
        onImportComplete={handleImportComplete}
      />

      <EditAulaDialog
        aula={editingAula}
        open={!!editingAula}
        onOpenChange={(open) => !open && setEditingAula(null)}
      />

      <AlertDialog open={!!deletingAula} onOpenChange={(open) => !open && setDeletingAula(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano de Aula?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A aula "{deletingAula?.topico}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingAula) {
                  await deleteAula.mutateAsync(deletingAula.id);
                  setDeletingAula(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingPadrao} onOpenChange={(open) => !open && setDeletingPadrao(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir aulas do Conteúdo Programático?</AlertDialogTitle>
            <AlertDialogDescription>
              Serão removidas <strong>{deletingPadrao?.count ?? 0}</strong> aula(s) da disciplina
              "{deletingPadrao?.nome}" do Conteúdo Programático. O Padrão de Marcação
              <strong> não </strong>será afetado. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingAulas}
              onClick={async () => {
                if (!deletingPadrao || !user?.id) return;
                setIsDeletingAulas(true);
                try {
                  const { error } = await supabase
                    .from("conteudo_programatico_aulas")
                    .delete()
                    .eq("user_id", user.id)
                    .eq("disciplina_nome", deletingPadrao.nome);
                  if (error) throw error;
                  await queryClient.invalidateQueries({
                    queryKey: ["conteudo-programatico-aulas"],
                  });
                  toast.success(
                    `${deletingPadrao.count} aula(s) de "${deletingPadrao.nome}" removida(s)`,
                  );
                  setDeletingPadrao(null);
                } catch (err: any) {
                  toast.error("Erro ao excluir aulas: " + err.message);
                } finally {
                  setIsDeletingAulas(false);
                }
              }}
            >
              {isDeletingAulas ? "Excluindo..." : "Excluir aulas"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
