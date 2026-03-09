import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { Anotacao } from "@/hooks/useNotes";
import {
  CheckCircle, AlertTriangle, Star, TrendingUp, Info, User, Calendar,
  MoreHorizontal, Trash2, MessageSquare, ClipboardCheck,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const noteTypes: Record<string, { label: string; icon: any; color: string; bgColor: string; variant: any }> = {
  positive: { label: "Positiva", icon: CheckCircle, color: "text-success", bgColor: "bg-success/10", variant: "default" },
  attention: { label: "Atenção", icon: AlertTriangle, color: "text-warning", bgColor: "bg-warning/10", variant: "secondary" },
  achievement: { label: "Conquista", icon: Star, color: "text-primary", bgColor: "bg-primary/10", variant: "default" },
  progress: { label: "Progresso", icon: TrendingUp, color: "text-success", bgColor: "bg-success/10", variant: "default" },
  concern: { label: "Preocupação", icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", variant: "destructive" },
  info: { label: "Informação", icon: Info, color: "text-muted-foreground", bgColor: "bg-muted/10", variant: "outline" },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-warning/20 text-warning" },
  em_andamento: { label: "Em andamento", color: "bg-primary/20 text-primary" },
  resolvido: { label: "Resolvido", color: "bg-success/20 text-success" },
};

interface Props {
  note: Anotacao;
  onUpdate: (id: string, updates: any) => void;
  onDelete: (id: string) => void;
}

export const NoteCard = ({ note, onUpdate, onDelete }: Props) => {
  const [showAdminNote, setShowAdminNote] = useState(false);
  const [adminText, setAdminText] = useState(note.observacao_admin || "");

  const type = noteTypes[note.tipo] || noteTypes.info;
  const Icon = type.icon;
  const status = statusLabels[note.status_acompanhamento] || statusLabels.pendente;

  return (
    <Card className="gradient-card shadow-card border-0 hover:shadow-elevated transition-smooth">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${type.bgColor} rounded-lg flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${type.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">{note.titulo}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{note.student_nome}</span>
                {note.professor_nome && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground italic">Prof. {note.professor_nome}</span>
                  </>
                )}
                {note.disciplina && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{note.disciplina}</span>
                  </>
                )}
                {note.turma_nome && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">{note.turma_nome}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={type.variant as any}>{type.label}</Badge>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${status.color}`}>{status.label}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onUpdate(note.id, { status_acompanhamento: "em_andamento" })}>
                  <ClipboardCheck className="w-4 h-4 mr-2" /> Em andamento
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onUpdate(note.id, { status_acompanhamento: "resolvido" })}>
                  <CheckCircle className="w-4 h-4 mr-2" /> Resolvido
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAdminNote(!showAdminNote)}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Obs. Administrativa
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(note.id)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-4">{note.conteudo}</p>

        {note.observacao_admin && !showAdminNote && (
          <div className="bg-accent/10 rounded-lg p-3 mb-3">
            <p className="text-xs font-medium text-accent-foreground mb-1">Observação Administrativa:</p>
            <p className="text-sm text-muted-foreground">{note.observacao_admin}</p>
          </div>
        )}

        {showAdminNote && (
          <div className="mb-3 space-y-2">
            <Textarea
              placeholder="Observação do administrativo..."
              value={adminText}
              onChange={(e) => setAdminText(e.target.value)}
              className="min-h-[60px]"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="gradient" onClick={() => { onUpdate(note.id, { observacao_admin: adminText }); setShowAdminNote(false); }}>
                Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdminNote(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(note.created_at).toLocaleDateString("pt-BR")}
          </div>
          {note.prioridade === "high" && (
            <Badge variant="destructive" className="text-xs">Alta Prioridade</Badge>
          )}
        </div>
      </div>
    </Card>
  );
};
