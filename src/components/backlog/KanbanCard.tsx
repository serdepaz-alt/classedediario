import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BacklogItem } from "@/hooks/useBacklog";
import {
  CheckCircle, Clock, AlertTriangle, User, Briefcase, GripVertical,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-warning/20 text-warning", icon: Clock },
  em_andamento: { label: "Em andamento", color: "bg-primary/20 text-primary", icon: AlertTriangle },
  concluido: { label: "Concluído", color: "bg-success/20 text-success", icon: CheckCircle },
};

interface Props {
  item: BacklogItem;
  onStatusChange: (id: string, status: string) => void;
  onMarkRead: (id: string) => void;
}

export const KanbanCard = ({ item, onStatusChange, onMarkRead }: Props) => {
  const st = statusConfig[item.status] || statusConfig.pendente;

  return (
    <Card
      className={`p-3 gradient-card border shadow-sm hover:shadow-card transition-smooth cursor-default ${!item.lido ? "ring-2 ring-primary/20 border-primary/30" : "border-border/50"}`}
      onClick={() => { if (!item.lido) onMarkRead(item.id); }}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground leading-tight flex-1">{item.titulo.replace(/^\[(Admin|Prof)\]\s*/, "")}</h4>
          {!item.lido && <Badge variant="default" className="text-[10px] px-1.5 py-0 shrink-0">Novo</Badge>}
        </div>

        {item.descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{item.descricao}</p>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {item.student_nome && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/50 text-accent-foreground">
              {item.student_nome}
            </span>
          )}
          {item.turma_nome && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {item.turma_nome}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
              item.responsavel_tipo === "professor" ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"
            }`}>
              {item.responsavel_tipo === "professor" ? <User className="w-2.5 h-2.5" /> : <Briefcase className="w-2.5 h-2.5" />}
              {item.responsavel_nome}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {item.prioridade === "high" && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">Alta</Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.created_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
        </div>

        <select
          value={item.status}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(item.id, e.target.value);
            if (!item.lido) onMarkRead(item.id);
          }}
          className="w-full text-xs px-2 py-1 rounded border border-input bg-background mt-1"
        >
          <option value="pendente">⏳ Pendente</option>
          <option value="em_andamento">🔄 Em andamento</option>
          <option value="concluido">✅ Concluído</option>
        </select>
      </div>
    </Card>
  );
};
