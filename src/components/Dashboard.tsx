import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CalendarCheck, TrendingUp, BookOpen, Plus, GraduationCap, Clock } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

export const Dashboard = () => {
  const { stats, recentActivities, activeDisciplina, loading } = useDashboardData();
  const navigate = useNavigate();

  const statCards = [
    {
      title: "Total de Estudantes",
      value: String(stats.totalStudents),
      change: activeDisciplina ? `Turma ${activeDisciplina.turma_nome ?? ""}` : "Todas as turmas",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Presença Média",
      value: `${stats.avgAttendance}%`,
      change: stats.attendanceChange,
      icon: CalendarCheck,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Média da Turma",
      value: stats.avgGrade > 0 ? String(stats.avgGrade) : "—",
      change: stats.gradeChange,
      icon: TrendingUp,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Aulas Concluídas",
      value: String(stats.totalLessons),
      change: activeDisciplina ? activeDisciplina.nome : "Geral",
      icon: BookOpen,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
  ];

  const activityIcon: Record<string, string> = {
    grade: "text-warning",
    attendance: "text-success",
    note: "text-primary",
    lesson: "text-accent",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          {activeDisciplina ? (
            <div className="flex items-center gap-2 mt-1">
              <GraduationCap className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-sm">
                {activeDisciplina.nome} — {activeDisciplina.turma_nome ?? activeDisciplina.curso}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {activeDisciplina.turno}
              </Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">Visão geral</p>
          )}
        </div>
        <Button variant="hero" size="lg" onClick={() => navigate("/attendance")}>
          <CalendarCheck className="w-5 h-5" />
          Fazer Chamada
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-6 gradient-card shadow-card border-0">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">{stat.change}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="p-6 gradient-card shadow-card border-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Atividades Recentes</h3>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma atividade recente</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === "grade" ? "bg-warning" :
                    activity.type === "attendance" ? "bg-success" :
                    "bg-primary"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.student}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.action}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6 gradient-card shadow-card border-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Ações Rápidas</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate("/students")}>
              <Users className="w-6 h-6" />
              Estudantes
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate("/attendance")}>
              <CalendarCheck className="w-6 h-6" />
              Presença
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate("/grades")}>
              <TrendingUp className="w-6 h-6" />
              Notas
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-2" onClick={() => navigate("/notes")}>
              <BookOpen className="w-6 h-6" />
              Anotações
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
