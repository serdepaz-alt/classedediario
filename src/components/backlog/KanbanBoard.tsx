import { Card } from "@/components/ui/card";
import { KanbanCard } from "./KanbanCard";
import type { BacklogItem } from "@/hooks/useBacklog";
import { CheckCircle, Clock, AlertTriangle, ClipboardList } from "lucide-react";

const columns = [
  { key: "pendente", label: "Pendente", icon: Clock, headerColor: "border-warning text-warning", bgColor: "bg-warning/5" },
  { key: "em_andamento", label: "Em Andamento", icon: AlertTriangle, headerColor: "border-primary text-primary", bgColor: "bg-primary/5" },
  { key: "concluido", label: "Concluído", icon: CheckCircle, headerColor: "border-success text-success", bgColor: "bg-success/5" },
];

interface Props {
  items: BacklogItem[];
  onStatusChange: (id: string, status: string) => void;
  onMarkRead: (id: string) => void;
}

export const KanbanBoard = ({ items, onStatusChange, onMarkRead }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-h-[400px]">
      {columns.map((col) => {
        const colItems = items.filter(i => i.status === col.key);
        const Icon = col.icon;

        return (
          <div key={col.key} className={`rounded-xl ${col.bgColor} p-3`}>
            {/* Column Header */}
            <div className={`flex items-center gap-2 mb-3 pb-2 border-b-2 ${col.headerColor}`}>
              <Icon className="w-4 h-4" />
              <h3 className="text-sm font-semibold">{col.label}</h3>
              <span className="ml-auto text-xs font-bold bg-background rounded-full w-6 h-6 flex items-center justify-center shadow-sm">
                {colItems.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {colItems.map((item) => (
                <KanbanCard
                  key={item.id}
                  item={item}
                  onStatusChange={onStatusChange}
                  onMarkRead={onMarkRead}
                />
              ))}

              {colItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Nenhum item</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
