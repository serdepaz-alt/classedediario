import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBacklog } from "@/hooks/useBacklog";
import {
  CheckCircle, Clock, AlertTriangle, User, Briefcase,
  Eye, Loader2, ClipboardList, Filter,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-warning/20 text-warning", icon: Clock },
  em_andamento: { label: "Em andamento", color: "bg-primary/20 text-primary", icon: AlertTriangle },
  concluido: { label: "Concluído", color: "bg-success/20 text-success", icon: CheckCircle },
};

const tipoConfig: Record<string, { label: string; color: string }> = {
  admin: { label: "Administrativo", color: "bg-accent text-accent-foreground" },
  professor: { label: "Professor", color: "bg-primary/10 text-primary" },
};

export const BacklogPanel = () => {
  const { items, loading, unreadCount, markAsRead, markAllAsRead, updateStatus } = useBacklog();
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");

  const filtered = items.filter(item => {
    const matchStatus = filterStatus === "all" || item.status === filterStatus;
    const matchTipo = filterTipo === "all" || item.responsavel_tipo === filterTipo;
    return matchStatus && matchTipo;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backlog de Acompanhamento</h1>
          <p className="text-muted-foreground">Acompanhe as tarefas geradas pelas anotações dos professores</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Eye className="w-4 h-4 mr-2" />
            Marcar todas como lidas ({unreadCount})
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "pendente").length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "em_andamento").length}</p>
              <p className="text-sm text-muted-foreground">Em andamento</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 gradient-card shadow-card border-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{items.filter(i => i.status === "concluido").length}</p>
              <p className="text-sm text-muted-foreground">Concluídos</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 gradient-card shadow-card border-0">
        <div className="flex flex-wrap items-center gap-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluído</option>
          </select>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-input bg-background text-sm"
          >
            <option value="all">Todos os responsáveis</option>
            <option value="admin">Administrativo</option>
            <option value="professor">Professor</option>
          </select>
        </div>
      </Card>

      {/* Items List */}
      <div className="space-y-3">
        {filtered.map((item) => {
          const st = statusConfig[item.status] || statusConfig.pendente;
          const tp = tipoConfig[item.responsavel_tipo] || tipoConfig.admin;
          const StIcon = st.icon;

          return (
            <Card
              key={item.id}
              className={`p-4 gradient-card shadow-card border-0 transition-smooth ${!item.lido ? "ring-2 ring-primary/30" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${st.color}`}>
                    <StIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-foreground text-sm">{item.titulo}</h3>
                      {!item.lido && <Badge variant="default" className="text-xs">Novo</Badge>}
                    </div>
                    {item.descricao && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.descricao}</p>
                    )}
                    <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tp.color}`}>
                        {item.responsavel_tipo === "professor" ? <User className="w-3 h-3 inline mr-1" /> : <Briefcase className="w-3 h-3 inline mr-1" />}
                        {item.responsavel_nome}
                      </span>
                      {item.student_nome && <span>Aluno: {item.student_nome}</span>}
                      {item.turma_nome && <span>• {item.turma_nome}</span>}
                      <span>• {new Date(item.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  <select
                    value={item.status}
                    onChange={(e) => {
                      updateStatus(item.id, e.target.value);
                      if (!item.lido) markAsRead(item.id);
                    }}
                    className="text-xs px-2 py-1 rounded border border-input bg-background"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="p-12 text-center gradient-card shadow-card border-0">
          <ClipboardList className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma tarefa no backlog</h3>
          <p className="text-muted-foreground">As tarefas serão criadas automaticamente quando anotações forem registradas</p>
        </Card>
      )}
    </div>
  );
};
