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
import { MoreVertical, Pencil, Trash2, Mail, Phone, GraduationCap, Briefcase, MessageCircle } from "lucide-react";

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
  onEdit: (professor: Professor) => void;
  onDelete: (professor: Professor) => void;
}

export const ProfessorCard = ({ professor, onEdit, onDelete }: ProfessorCardProps) => {
  const statusColors: Record<string, string> = {
    Ativo: "bg-success/10 text-success border-success/20",
    Inativo: "bg-muted text-muted-foreground border-muted",
    Afastado: "bg-warning/10 text-warning border-warning/20",
  };

  return (
    <Card className="group hover:shadow-card transition-smooth cursor-pointer" onClick={() => onEdit(professor)}>
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
                <Badge
                  variant="outline"
                  className={statusColors[professor.status || "Ativo"]}
                >
                  {professor.status || "Ativo"}
                </Badge>
                {professor.funcao && (
                  <Badge variant="secondary" className="text-xs">
                    {professor.funcao}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(professor)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(professor)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 space-y-2">
          {professor.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{professor.email}</span>
            </div>
          )}
          {professor.telefone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4" />
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
              <GraduationCap className="h-4 w-4" />
              <span>{professor.especialidade}</span>
            </div>
          )}
          {professor.formacao && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span>{professor.formacao}</span>
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
