import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Mail, Phone, User as UserIcon } from "lucide-react";

interface Administrador {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  funcao: string | null;
  status: string;
  observacoes: string | null;
}

const AdministradoresPage = () => {
  const [admins, setAdmins] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cad_administradores")
        .select("*")
        .order("nome");
      setAdmins((data as Administrador[]) ?? []);
      setLoading(false);
    })();
  }, []);

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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Administradores</h1>
            <p className="text-muted-foreground">Usuários com acesso administrativo ao sistema</p>
          </div>
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
                      <h3 className="font-semibold text-foreground truncate">{a.nome}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={statusColors[a.status] ?? ""}>
                          {a.status}
                        </Badge>
                        {a.funcao && (
                          <Badge variant="secondary" className="text-xs">{a.funcao}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{a.email}</span>
                    </div>
                    {a.telefone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{a.telefone}</span>
                      </div>
                    )}
                    {a.observacoes && (
                      <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
                        <UserIcon className="h-3.5 w-3.5 mt-0.5" />
                        <span>{a.observacoes}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdministradoresPage;