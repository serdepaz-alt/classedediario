import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBacklog, QuadroType, BacklogItem } from "@/hooks/useBacklog";
import { KanbanBoard } from "./KanbanBoard";
import { TriagemMailDialog } from "./TriagemMailDialog";
import {
  Eye, Loader2, CalendarCheck, TrendingUp, StickyNote,
} from "lucide-react";

const quadros: { key: QuadroType; label: string; icon: any }[] = [
  { key: "presenca", label: "Presença", icon: CalendarCheck },
  { key: "notas", label: "Notas", icon: TrendingUp },
  { key: "anotacoes", label: "Anotações", icon: StickyNote },
];

export const BacklogPanel = () => {
  const { items, loading, unreadCount, getItemsByQuadro, markAsRead, markAllAsRead, updateStatus } = useBacklog();
  const [activeQuadro, setActiveQuadro] = useState<QuadroType>("anotacoes");
  const [triagemItem, setTriagemItem] = useState<BacklogItem | null>(null);
  const [showTriagem, setShowTriagem] = useState(false);

  const handleTriagem = (item: BacklogItem) => {
    setTriagemItem(item);
    setShowTriagem(true);
  };

  const handleTriagemSent = (id: string) => {
    updateStatus(id, "em_andamento");
    markAsRead(id);
  };

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
          <h1 className="text-3xl font-bold text-foreground">Kanban — Backlog Administrativo</h1>
          <p className="text-muted-foreground">Acompanhe cada situação de perto por quadro</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <Eye className="w-4 h-4 mr-2" />
            Marcar todas como lidas ({unreadCount})
          </Button>
        )}
      </div>

      {/* Tabs for Quadros */}
      <Tabs value={activeQuadro} onValueChange={(v) => setActiveQuadro(v as QuadroType)}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          {quadros.map((q) => {
            const Icon = q.icon;
            const count = getItemsByQuadro(q.key).length;
            const pendentes = getItemsByQuadro(q.key).filter(i => i.status === "pendente").length;

            return (
              <TabsTrigger
                key={q.key}
                value={q.key}
                className="flex items-center gap-2 py-3 data-[state=active]:shadow-card"
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{q.label}</span>
                <span className="sm:hidden text-xs">{q.label}</span>
                {count > 0 && (
                  <Badge variant={pendentes > 0 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 ml-1">
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {quadros.map((q) => (
          <TabsContent key={q.key} value={q.key} className="mt-4">
            <KanbanBoard
              items={getItemsByQuadro(q.key)}
              onStatusChange={updateStatus}
              onMarkRead={markAsRead}
              onTriagem={handleTriagem}
            />
          </TabsContent>
        ))}
      </Tabs>

      <TriagemMailDialog
        open={showTriagem}
        onOpenChange={setShowTriagem}
        item={triagemItem}
        onSent={handleTriagemSent}
      />
    </div>
  );
};
