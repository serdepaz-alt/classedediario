import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AulaProgramatica, useConteudoProgramaticoAulas } from "@/hooks/useConteudoProgramaticoAulas";

interface Props {
  aula: AulaProgramatica | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditAulaDialog = ({ aula, open, onOpenChange }: Props) => {
  const { updateAula } = useConteudoProgramaticoAulas();
  const [form, setForm] = useState({
    topico: "",
    data_aula: "",
    objetivo: "",
    metodologia: "",
    recursos: "",
    tipo_avaliacao: "aula",
    status: "planejado",
    observacoes: "",
  });

  useEffect(() => {
    if (aula) {
      setForm({
        topico: aula.topico || "",
        data_aula: aula.data_aula || "",
        objetivo: aula.objetivo || "",
        metodologia: aula.metodologia || "",
        recursos: aula.recursos || "",
        tipo_avaliacao: aula.tipo_avaliacao || "aula",
        status: aula.status || "planejado",
        observacoes: aula.observacoes || "",
      });
    }
  }, [aula]);

  const handleSave = async () => {
    if (!aula) return;
    await updateAula.mutateAsync({
      id: aula.id,
      updates: {
        topico: form.topico.trim(),
        data_aula: form.data_aula,
        objetivo: form.objetivo || null,
        metodologia: form.metodologia || null,
        recursos: form.recursos || null,
        tipo_avaliacao: form.tipo_avaliacao,
        status: form.status,
        observacoes: form.observacoes || null,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano de Aula</DialogTitle>
          <DialogDescription>
            {aula?.disciplina_nome}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data da Aula</Label>
              <Input
                type="date"
                value={form.data_aula}
                onChange={(e) => setForm({ ...form, data_aula: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo_avaliacao} onValueChange={(v) => setForm({ ...form, tipo_avaliacao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aula">Aula</SelectItem>
                  <SelectItem value="revisao">Revisão</SelectItem>
                  <SelectItem value="avaliacao">Avaliação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tópico *</Label>
            <Input value={form.topico} onChange={(e) => setForm({ ...form, topico: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Objetivo</Label>
            <Textarea rows={2} value={form.objetivo} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Metodologia</Label>
            <Textarea rows={2} value={form.metodologia} onChange={(e) => setForm({ ...form, metodologia: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Recursos</Label>
            <Input value={form.recursos} onChange={(e) => setForm({ ...form, recursos: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!form.topico.trim() || updateAula.isPending}>
            {updateAula.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};