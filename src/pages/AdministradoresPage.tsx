import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Mail, MessageCircle, IdCard, Pencil, KeyRound, AtSign, Plus } from "lucide-react";

interface Administrador {
  id: string;
  user_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  cpf: string | null;
  funcao: string | null;
  status: string;
  observacoes: string | null;
}

const AdministradoresPage = () => {
  const [admins, setAdmins] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Administrador | null>(null);
  const [form, setForm] = useState({ nome: "", whatsapp: "", cpf: "", login: "", senha: "" });
  const [savingPwd, setSavingPwd] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", email: "", senha: "", whatsapp: "", cpf: "", funcao: "" });
  const [savingNew, setSavingNew] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("cad_administradores")
      .select("*")
      .order("nome");
    setAdmins((data as Administrador[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (a: Administrador) => {
    setEditing(a);
    setForm({
      nome: a.nome ?? "",
      whatsapp: a.whatsapp ?? "",
      cpf: a.cpf ?? "",
      login: a.email ?? "",
      senha: "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const { error } = await supabase
      .from("cad_administradores")
      .update({
        nome: form.nome,
        whatsapp: form.whatsapp || null,
        cpf: form.cpf || null,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }

    if (form.senha) {
      if (form.senha.length < 10) {
        toast.error("Senha deve ter ao menos 10 caracteres");
        return;
      }
      if (!editing.user_id) {
        toast.error("Este administrador não tem usuário de autenticação vinculado");
        return;
      }
      setSavingPwd(true);
      const { error: pwdErr } = await supabase.functions.invoke("update-admin-password", {
        body: { targetUserId: editing.user_id, newPassword: form.senha },
      });
      setSavingPwd(false);
      if (pwdErr) {
        toast.error("Erro ao atualizar senha: " + pwdErr.message);
        return;
      }
      toast.success("Senha atualizada");
    }

    toast.success("Administrador atualizado");
    setEditing(null);
    load();
  };

  const waLink = (n: string) => {
    const digits = n.replace(/\D/g, "");
    const num = digits.startsWith("55") ? digits : "55" + digits;
    return `https://wa.me/${num}`;
  };

  const createAdmin = async () => {
    if (!newForm.nome || !newForm.email || newForm.senha.length < 10) {
      toast.error("Nome, e-mail e senha (mín. 10 caracteres) são obrigatórios");
      return;
    }
    setSavingNew(true);
    const { data, error } = await supabase.functions.invoke("create-admin", { body: newForm });
    setSavingNew(false);
    let errMsg: string | null = null;
    if (error) {
      // Tenta ler o corpo da resposta (FunctionsHttpError)
      try {
        const ctx = (error as any).context;
        if (ctx?.json) {
          const body = await ctx.json();
          errMsg = body?.error ?? null;
        } else if (ctx?.text) {
          errMsg = await ctx.text();
        }
      } catch {
        // ignore
      }
      toast.error(errMsg ?? error.message ?? "Erro ao criar administrador");
      return;
    }
    if ((data as any)?.error) {
      toast.error((data as any).error);
      return;
    }
    toast.success("Administrador criado");
    setCreating(false);
    setNewForm({ nome: "", email: "", senha: "", whatsapp: "", cpf: "", funcao: "" });
    load();
  };

  const statusColors: Record<string, string> = {
    Ativo: "bg-success/10 text-success border-success/20",
    Inativo: "bg-muted text-muted-foreground border-muted",
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 gradient-primary rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">Administradores</h1>
            <p className="text-muted-foreground">Usuários com acesso administrativo ao sistema</p>
          </div>
          <Button onClick={() => setCreating(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Administrador
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : admins.length === 0 ? (
          <p className="text-muted-foreground">Nenhum administrador cadastrado.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {admins.map((a) => (
              <Card key={a.id} className="hover:shadow-card transition-smooth">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg font-semibold text-primary">
                        {a.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">Adm. {a.nome}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={statusColors[a.status] ?? ""}>
                          {a.status}
                        </Badge>
                        {a.funcao && (
                          <Badge variant="secondary" className="text-xs">{a.funcao}</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(a)}
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AtSign className="h-3.5 w-3.5" />
                      <span className="truncate"><strong>Login:</strong> {a.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>Senha: ••••••••</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{a.email}</span>
                    </div>
                    {a.whatsapp && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MessageCircle className="h-3.5 w-3.5" />
                        <a
                          href={waLink(a.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          {a.whatsapp}
                        </a>
                      </div>
                    )}
                    {a.cpf && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <IdCard className="h-3.5 w-3.5" />
                        <span>CPF: {a.cpf}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Administrador</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome do Adm</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </div>
              <div>
                <Label>Login (e-mail)</Label>
                <Input value={form.login} disabled />
                <p className="text-xs text-muted-foreground mt-1">
                  O login é o e-mail e não pode ser alterado aqui.
                </p>
              </div>
              <div>
                <Label>Nova Senha</Label>
                <Input
                  type="password"
                  placeholder="Deixe em branco para não alterar"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo 10 caracteres. A senha atual não pode ser exibida (hash bcrypt).
                </p>
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                />
              </div>
              <div>
                <Label>CPF</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={saveEdit} disabled={savingPwd}>
                {savingPwd ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Administrador</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={newForm.nome} onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })} />
              </div>
              <div>
                <Label>E-mail (login) *</Label>
                <Input type="email" value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} />
              </div>
              <div>
                <Label>Senha * (mín. 10 caracteres)</Label>
                <Input type="password" value={newForm.senha} onChange={(e) => setNewForm({ ...newForm, senha: e.target.value })} />
              </div>
              <div>
                <Label>Função</Label>
                <Input placeholder="Ex: Administrador Geral" value={newForm.funcao} onChange={(e) => setNewForm({ ...newForm, funcao: e.target.value })} />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input placeholder="(00) 00000-0000" value={newForm.whatsapp} onChange={(e) => setNewForm({ ...newForm, whatsapp: e.target.value })} />
              </div>
              <div>
                <Label>CPF</Label>
                <Input placeholder="000.000.000-00" value={newForm.cpf} onChange={(e) => setNewForm({ ...newForm, cpf: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreating(false)}>Cancelar</Button>
              <Button onClick={createAdmin} disabled={savingNew}>
                {savingNew ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default AdministradoresPage;