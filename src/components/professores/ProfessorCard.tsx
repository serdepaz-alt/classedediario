import { useState } from "react";
import { Professor } from "@/hooks/useProfessores";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { MoreVertical, Pencil, Trash2, Mail, Phone, GraduationCap, Briefcase, MessageCircle, CalendarDays, Clock, Users } from "lucide-react";
import type { ProfessorStats } from "@/hooks/useProfessorStats";

const cleanPhone = (phone: string) => phone.replace(/\D/g, "");

const PhoneLink = ({ phone }: { phone: string }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const digits = cleanPhone(phone);
  const whatsappNumber = digits.startsWith("0") ? "55" + digits.slice(1) : "55" + digits;

  return (
    <>
      <span
        className="cursor-pointer hover:text-primary underline-offset-2 hover:underline transition-colors"
        onClick={(e) => { e.stopPropagation(); setDialogOpen(true); }}
      >
        {phone}
      </span>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Contatar {phone}</AlertDialogTitle>
            <AlertDialogDescription>Como deseja entrar em contato?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <a href={`tel:${digits}`} className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" /> Ligar
              </a>
            </AlertDialogAction>
            <AlertDialogAction asChild>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

interface ProfessorCardProps {
  professor: Professor;
  stats?: ProfessorStats;
  onEdit: (professor: Professor) => void;
  onDelete: (professor: Professor) => void;
  onViewProfile: (professor: Professor) => void;
}

export const ProfessorCard = ({ professor, stats, onEdit, onDelete, onViewProfile }: ProfessorCardProps) => {
  const statusColors: Record<string, string> = {
    Ativo: "bg-success/10 text-success border-success/20",
    Inativo: "bg-muted text-muted-foreground border-muted",
    Afastado: "bg-warning/10 text-warning border-warning/20",
  };

  const disciplinas = professor.disciplinas_lecionar
    ? professor.disciplinas_lecionar.split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  return (
    <Card className="group hover:shadow-card transition-smooth cursor-pointer" onClick={() => onViewProfile(professor)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {professor.nome.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{professor.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={statusColors[professor.status || "Ativo"]}>
                  {professor.status || "Ativo"}
                </Badge>
                {professor.funcao && (
                  <Badge variant="secondary" className="text-xs">{professor.funcao}</Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewProfile(professor); }}>
                <GraduationCap className="mr-2 h-4 w-4" /> Ver Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(professor); }}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(professor); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mt-3 bg-muted/40 rounded-lg p-2">
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{stats.totalAulas}</p>
              <p className="text-[10px] text-muted-foreground">Aulas Total</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{stats.aulasMesAtual}</p>
              <p className="text-[10px] text-muted-foreground">Este Mês</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-foreground">{Math.round(stats.totalHoras)}h</p>
              <p className="text-[10px] text-muted-foreground">Horas</p>
            </div>
          </div>
        )}

        {/* Turmas vinculadas */}
        {stats && stats.turmas.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <Users className="h-3 w-3 text-muted-foreground shrink-0" />
            {stats.turmas.slice(0, 3).map((t) => (
              <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
            ))}
            {stats.turmas.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{stats.turmas.length - 3}</span>
            )}
          </div>
        )}

        {/* Disciplinas como badges */}
        {disciplinas.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <GraduationCap className="h-3 w-3 text-muted-foreground shrink-0" />
            {disciplinas.slice(0, 3).map((d) => (
              <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>
            ))}
            {disciplinas.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{disciplinas.length - 3}</span>
            )}
          </div>
        )}

        <div className="mt-3 space-y-1.5">
          {professor.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{professor.email}</span>
            </div>
          )}
          {professor.telefone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              <PhoneLink phone={professor.telefone} />
              {professor.telefone2 && (
                <>
                  <span className="text-muted-foreground/60">|</span>
                  <PhoneLink phone={professor.telefone2} />
                </>
              )}
            </div>
          )}
          {professor.especialidade && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              <span className="truncate">{professor.especialidade}</span>
            </div>
          )}
          {professor.coren && (
            <p className="text-xs text-muted-foreground">Coren: {professor.coren}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
