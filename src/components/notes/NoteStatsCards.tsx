import { Card } from "@/components/ui/card";
import { StickyNote, CheckCircle, AlertTriangle, Clock } from "lucide-react";

interface Props {
  stats: { total: number; positive: number; attention: number; pendentes: number };
}

export const NoteStatsCards = ({ stats }: Props) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
    <Card className="p-4 gradient-card shadow-card border-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <StickyNote className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total</p>
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
          <Clock className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{stats.pendentes}</p>
          <p className="text-sm text-muted-foreground">Pendentes</p>
        </div>
      </div>
    </Card>
  </div>
);
