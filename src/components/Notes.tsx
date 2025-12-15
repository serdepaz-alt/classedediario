import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  StickyNote, 
  Calendar, 
  User, 
  AlertTriangle,
  CheckCircle,
  Info,
  Star,
  Filter,
  MoreHorizontal,
  TrendingUp 
} from "lucide-react";

const notesData = [
  {
    id: 1,
    student: "Ana Silva",
    title: "Excelente participação em matemática",
    content: "Ana demonstrou grande interesse durante as aulas de equações do segundo grau. Sempre faz perguntas pertinentes e ajuda os colegas.",
    type: "positive",
    date: "2024-01-15",
    priority: "normal",
    subject: "Matemática"
  },
  {
    id: 2,
    student: "João Santos",
    title: "Dificuldade em concentração",
    content: "João tem apresentado dificuldades para manter o foco durante as aulas. Recomendo conversa com os pais para verificar se há algum problema em casa.",
    type: "attention",
    date: "2024-01-14",
    priority: "high",
    subject: "Comportamento"
  },
  {
    id: 3,
    student: "Maria Costa",
    title: "Destaque na apresentação de história",
    content: "Maria fez uma apresentação excepcional sobre a Revolução Industrial. Mostrou domínio do conteúdo e boa oratória.",
    type: "achievement",
    date: "2024-01-13",
    priority: "normal",
    subject: "História"
  },
  {
    id: 4,
    student: "Pedro Lima",
    title: "Progresso em português",
    content: "Pedro mostrou melhora significativa na interpretação de textos. As atividades extras de leitura estão surtindo efeito positivo.",
    type: "progress",
    date: "2024-01-12",
    priority: "normal",
    subject: "Português"
  },
  {
    id: 5,
    student: "Carla Souza",
    title: "Faltas excessivas",
    content: "Carla faltou 4 das últimas 6 aulas. É necessário entrar em contato com a família para entender o motivo e oferecer suporte.",
    type: "concern",
    date: "2024-01-11",
    priority: "high",
    subject: "Presença"
  }
];

const noteTypes = {
  positive: { 
    label: "Positiva", 
    icon: CheckCircle, 
    color: "text-success", 
    bgColor: "bg-success/10",
    variant: "default" as const
  },
  attention: { 
    label: "Atenção", 
    icon: AlertTriangle, 
    color: "text-warning", 
    bgColor: "bg-warning/10",
    variant: "secondary" as const
  },
  achievement: { 
    label: "Conquista", 
    icon: Star, 
    color: "text-primary", 
    bgColor: "bg-primary/10",
    variant: "default" as const
  },
  progress: { 
    label: "Progresso", 
    icon: TrendingUp, 
    color: "text-success", 
    bgColor: "bg-success/10",
    variant: "default" as const
  },
  concern: { 
    label: "Preocupação", 
    icon: AlertTriangle, 
    color: "text-destructive", 
    bgColor: "bg-destructive/10",
    variant: "destructive" as const
  },
  info: { 
    label: "Informação", 
    icon: Info, 
    color: "text-muted-foreground", 
    bgColor: "bg-muted/10",
    variant: "outline" as const
  }
};

export const Notes = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredNotes = notesData.filter(note => {
    const matchesSearch = note.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         note.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || note.type === selectedType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: notesData.length,
    positive: notesData.filter(n => n.type === "positive" || n.type === "achievement" || n.type === "progress").length,
    attention: notesData.filter(n => n.type === "attention" || n.type === "concern").length,
    thisWeek: notesData.filter(n => {
      const noteDate = new Date(n.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return noteDate >= weekAgo;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Anotações da Classe</h1>
          <p className="text-muted-foreground">Registre observações importantes sobre os estudantes</p>
        </div>
        <Button 
          variant="hero" 
          size="lg"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <Plus className="w-5 h-5" />
          Nova Anotação
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <StickyNote className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total de Anotações</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.positive}</p>
              <p className="text-sm text-muted-foreground">Positivas</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.attention}</p>
              <p className="text-sm text-muted-foreground">Requerem Atenção</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.thisWeek}</p>
              <p className="text-sm text-muted-foreground">Esta Semana</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <Card className="p-6 gradient-card shadow-card border-0">
          <h3 className="text-lg font-semibold text-foreground mb-4">Nova Anotação</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Estudante</label>
              <Input placeholder="Nome do estudante..." />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Tipo</label>
              <select className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="positive">Positiva</option>
                <option value="attention">Atenção</option>
                <option value="achievement">Conquista</option>
                <option value="progress">Progresso</option>
                <option value="concern">Preocupação</option>
                <option value="info">Informação</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Título</label>
            <Input placeholder="Título da anotação..." />
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-foreground mb-2 block">Conteúdo</label>
            <Textarea placeholder="Descreva sua observação..." className="min-h-[100px]" />
          </div>
          <div className="flex gap-3">
            <Button variant="gradient">Salvar Anotação</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <Card className="p-4 gradient-card shadow-card border-0">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por estudante, título ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Tipo:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
            >
              <option value="all">Todos</option>
              <option value="positive">Positivas</option>
              <option value="attention">Atenção</option>
              <option value="achievement">Conquistas</option>
              <option value="progress">Progresso</option>
              <option value="concern">Preocupações</option>
              <option value="info">Informações</option>
            </select>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>
      </Card>

      {/* Notes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredNotes.map((note) => {
          const noteType = noteTypes[note.type as keyof typeof noteTypes];
          const Icon = noteType.icon;
          
          return (
            <Card key={note.id} className="gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth">
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${noteType.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${noteType.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{note.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{note.student}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">{note.subject}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={noteType.variant}>{noteType.label}</Badge>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{note.content}</p>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(note.date).toLocaleDateString('pt-BR')}
                  </div>
                  {note.priority === "high" && (
                    <Badge variant="destructive" className="text-xs">
                      Alta Prioridade
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredNotes.length === 0 && (
        <Card className="p-12 text-center gradient-card shadow-card border-0">
          <StickyNote className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma anotação encontrada</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Tente ajustar sua busca" : "Comece adicionando sua primeira anotação"}
          </p>
          <Button variant="gradient" onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4" />
            Nova Anotação
          </Button>
        </Card>
      )}
    </div>
  );
};