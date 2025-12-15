import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CalendarCheck, TrendingUp, BookOpen, Plus } from "lucide-react";

const stats = [
  {
    title: "Total de Estudantes",
    value: "32",
    change: "+2 este mês",
    icon: Users,
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    title: "Presença Média",
    value: "94%",
    change: "+1.2% esta semana",
    icon: CalendarCheck,
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    title: "Média da Turma",
    value: "8.7",
    change: "+0.3 este bimestre",
    icon: TrendingUp,
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    title: "Aulas Ministradas",
    value: "48",
    change: "12 esta semana",
    icon: BookOpen,
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

const recentActivities = [
  { type: "grade", student: "Ana Silva", action: "Nota adicionada: 9.5 em Matemática", time: "2 horas atrás" },
  { type: "attendance", student: "João Santos", action: "Marcado como presente", time: "4 horas atrás" },
  { type: "note", student: "Maria Costa", action: "Anotação adicionada: Excelente participação", time: "1 dia atrás" },
  { type: "grade", student: "Pedro Lima", action: "Nota adicionada: 8.0 em História", time: "2 dias atrás" },
];

export const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral da sua turma</p>
        </div>
        <Button variant="hero" size="lg">
          <Plus className="w-5 h-5" />
          Ação Rápida
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 gradient-card shadow-card border-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-success mt-1">{stat.change}</p>
                </div>
                <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 gradient-card shadow-card border-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Atividades Recentes</h3>
            <Button variant="ghost" size="sm">Ver todas</Button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.student}</p>
                  <p className="text-xs text-muted-foreground">{activity.action}</p>
                  <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6 gradient-card shadow-card border-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Ações Rápidas</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2">
              <Users className="w-6 h-6" />
              Adicionar Estudante
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <CalendarCheck className="w-6 h-6" />
              Marcar Presença
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <TrendingUp className="w-6 h-6" />
              Lançar Nota
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2">
              <BookOpen className="w-6 h-6" />
              Nova Anotação
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};