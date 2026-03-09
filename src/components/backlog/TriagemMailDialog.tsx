import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { BacklogItem } from "@/hooks/useBacklog";
import { Mail, ShieldCheck, AlertTriangle, User, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: BacklogItem | null;
  onSent: (id: string) => void;
}

const checklistItems = [
  { id: "dados", label: "Dados do aluno conferidos" },
  { id: "conteudo", label: "Conteúdo da mensagem revisado" },
  { id: "pertinencia", label: "Pertinência do comunicado verificada" },
  { id: "nao_prioritario", label: "Item confirmado como NÃO prioritário" },
];

export const TriagemMailDialog = ({ open, onOpenChange, item, onSent }: Props) => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [observacao, setObservacao] = useState("");

  if (!item) return null;

  const isPriority = item.prioridade === "high";
  const allChecked = checklistItems.every(c => checkedItems[c.id]);
  const studentEmail = item.student_email;
  const studentNome = item.student_nome || "Aluno";

  const buildMailto = () => {
    const subject = encodeURIComponent(`Comunicado Escolar — ${item.titulo.replace(/^\[(Admin|Prof)\]\s*/, "")}`);
    const body = encodeURIComponent(
      `Prezado(a) ${studentNome},\n\n` +
      `Gostaríamos de informá-lo(a) sobre o seguinte assunto:\n\n` +
      `${item.descricao || item.titulo}\n\n` +
      (observacao ? `Observação adicional: ${observacao}\n\n` : "") +
      `Atenciosamente,\n` +
      `Secretaria Acadêmica\n` +
      `Diário de Classe — Sistema Educacional`
    );
    return `mailto:${studentEmail || ""}?subject=${subject}&body=${body}`;
  };

  const handleSend = () => {
    if (!studentEmail) {
      toast.error("Aluno não possui e-mail cadastrado");
      return;
    }
    window.open(buildMailto(), "_blank");
    onSent(item.id);
    toast.success("Cliente de e-mail aberto com sucesso!");
    onOpenChange(false);
    setCheckedItems({});
    setObservacao("");
  };

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setCheckedItems({}); setObservacao(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Triagem — Envio de Comunicado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item info */}
          <div className="rounded-lg bg-muted/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{item.titulo.replace(/^\[(Admin|Prof)\]\s*/, "")}</span>
            </div>
            {item.descricao && <p className="text-xs text-muted-foreground">{item.descricao}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> {studentNome}</span>
              {item.turma_nome && <span>• {item.turma_nome}</span>}
              {studentEmail && <span>• {studentEmail}</span>}
            </div>
          </div>

          {/* Priority block */}
          {isPriority && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Item de Alta Prioridade</p>
                <p className="text-xs text-muted-foreground">Itens prioritários exigem atendimento presencial ou contato direto. O envio por e-mail está bloqueado para este item.</p>
              </div>
            </div>
          )}

          {/* No email warning */}
          {!studentEmail && !isPriority && (
            <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning">Aluno sem e-mail cadastrado</p>
                <p className="text-xs text-muted-foreground">Cadastre o e-mail do aluno na ficha para habilitar o envio.</p>
              </div>
            </div>
          )}

          {/* Checklist */}
          {!isPriority && (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">Checklist de Triagem</p>
                {checklistItems.map(c => (
                  <div key={c.id} className="flex items-center gap-2">
                    <Checkbox
                      id={c.id}
                      checked={!!checkedItems[c.id]}
                      onCheckedChange={() => toggleCheck(c.id)}
                    />
                    <label htmlFor={c.id} className="text-sm text-muted-foreground cursor-pointer">{c.label}</label>
                  </div>
                ))}
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Observação adicional (opcional)</label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Adicione uma observação que será incluída no corpo do e-mail..."
                  className="min-h-[60px]"
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            {!isPriority && (
              <Button
                variant="gradient"
                disabled={!allChecked || !studentEmail}
                onClick={handleSend}
              >
                <Mail className="w-4 h-4 mr-2" />
                Enviar E-mail
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
