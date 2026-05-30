import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

interface ContratoView {
  id: string;
  professor_nome: string;
  disciplina_nome: string;
  carga_horaria: number;
  periodo_aulas: string;
  valor_numerico: number;
  valor_extenso: string;
  status: string;
  aceito_em: string | null;
  enviado_em: string;
}

const AceiteContratoPage = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [loading, setLoading] = useState(true);
  const [contrato, setContrato] = useState<ContratoView | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aceito, setAceito] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link inválido. Token não informado.");
      setLoading(false);
      return;
    }
    fetch(`${SUPABASE_URL}/functions/v1/get-contract-by-token?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setContrato(data.contrato);
          setPdfUrl(data.pdf_url);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (action: "aceitar" | "recusar") => {
    if (action === "aceitar" && !aceito) {
      toast.error("Marque a caixa de aceite antes de continuar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/accept-contract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, action: action === "recusar" ? "recusar" : "aceitar" }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(action === "aceitar" ? "Contrato aceito com sucesso!" : "Contrato recusado.");
      setContrato((prev) => prev ? { ...prev, status: data.status, aceito_em: action === "aceitar" ? new Date().toISOString() : null } : prev);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !contrato) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" /> Não foi possível abrir o contrato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error || "Contrato não encontrado."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jaAceito = contrato.status === "aceito";
  const recusado = contrato.status === "recusado";

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Contrato de Trabalho — {contrato.disciplina_nome}
              </CardTitle>
              <Badge
                variant={jaAceito ? "default" : recusado ? "destructive" : "secondary"}
                className="uppercase"
              >
                {contrato.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-semibold">Contratado(a):</span> {contrato.professor_nome}</p>
            <p><span className="font-semibold">Disciplina:</span> {contrato.disciplina_nome}</p>
            <p><span className="font-semibold">Carga horária:</span> {contrato.carga_horaria}h</p>
            <p><span className="font-semibold">Período:</span> {contrato.periodo_aulas}</p>
            <p>
              <span className="font-semibold">Valor:</span>{" "}
              {contrato.valor_numerico.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}{" "}
              <span className="text-muted-foreground">({contrato.valor_extenso})</span>
            </p>
          </CardContent>
        </Card>

        {pdfUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visualização do Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <iframe
                src={pdfUrl}
                title="Contrato"
                className="w-full h-[600px] rounded-md border"
              />
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline mt-2 inline-block"
              >
                Abrir PDF em nova aba
              </a>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 space-y-4">
            {jaAceito ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">
                  Contrato aceito{contrato.aceito_em ? ` em ${new Date(contrato.aceito_em).toLocaleString("pt-BR")}` : ""}.
                </span>
              </div>
            ) : recusado ? (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Contrato recusado.</span>
              </div>
            ) : (
              <>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={aceito}
                    onCheckedChange={(c) => setAceito(c === true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    Declaro que li integralmente o contrato acima, concordo com todas as suas
                    cláusulas e condições, e aceito formalmente os termos da prestação de
                    serviços educacionais para a disciplina <strong>{contrato.disciplina_nome}</strong>.
                  </span>
                </label>
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    disabled={submitting}
                    onClick={() => handleSubmit("recusar")}
                  >
                    Recusar
                  </Button>
                  <Button
                    disabled={!aceito || submitting}
                    onClick={() => handleSubmit("aceitar")}
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Aceitar Contrato
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AceiteContratoPage;