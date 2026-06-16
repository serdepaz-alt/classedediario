import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Printer, RotateCcw } from "lucide-react";

const STORAGE_KEY = "atestado-matricula-v1";

type AtestadoState = {
  logoUrl: string;
  signatureUrl: string;
  institutionName: string;
  parecer: string;
  cnpj: string;
  endereco: string;
  contatos: string;
  responsavelNome: string;
  responsavelCargo: string;
  corpo: string;
};

const DEFAULT_STATE: AtestadoState = {
  logoUrl: "",
  signatureUrl: "",
  institutionName: "Centro de Formação Técnica em Enfermagem Irmã Dulce",
  parecer: "Parecer CEE nº 228/2024 – Resolução CEE, nº 228/2024 D.O. 16/09/2024",
  cnpj: "CNPJ 52.062.409/0001-36",
  endereco: "Rua Arquimedes Gonçalves, nº 313, Nazaré, Salvador, Bahia",
  contatos: "Telefone: 3321-9366 / 3561-2523",
  responsavelNome: "Luciano Kleber C. Ribeiro",
  responsavelCargo: "Responsável Legal\nCentro de Form. Técnica em Enfermagem Irmã Dulce",
  corpo:
    "Atestamos, para os devidos fins, que o(a) aluno(a) {{NOME_ALUNO}}, matrícula nº {{MATRICULA}}, encontra-se regularmente matriculado(a) no curso {{CURSO}}, turma {{TURMA}}, turno {{TURNO}}, com início em {{DATA_INICIO}} e término previsto em {{DATA_TERMINO}}.\n\nPor ser expressão da verdade, firmamos o presente atestado.",
};

function useEditableState() {
  const [state, setState] = useState<AtestadoState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_STATE, ...JSON.parse(raw) } : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota */
    }
  }, [state]);

  const update = <K extends keyof AtestadoState>(k: K, v: AtestadoState[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  return { state, update, reset: () => setState(DEFAULT_STATE) };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const editableProps = (value: string, onChange: (v: string) => void) => ({
  contentEditable: true,
  suppressContentEditableWarning: true,
  onBlur: (e: React.FocusEvent<HTMLElement>) =>
    onChange(e.currentTarget.innerText),
  dangerouslySetInnerHTML: { __html: value.replace(/\n/g, "<br/>") },
  className:
    "outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm transition-colors",
});

export function AtestadoMatricula() {
  const { state, update, reset } = useEditableState();
  const logoInput = useRef<HTMLInputElement>(null);
  const sigInput = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logoUrl" | "signatureUrl",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await readFileAsDataUrl(file);
    update(field, url);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Toolbar (não imprime) */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => logoInput.current?.click()}>
          <Upload className="h-4 w-4 mr-2" /> Trocar logomarca
        </Button>
        <Button variant="outline" size="sm" onClick={() => sigInput.current?.click()}>
          <Upload className="h-4 w-4 mr-2" /> Trocar assinatura
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" /> Imprimir / PDF
        </Button>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4 mr-2" /> Restaurar padrão
        </Button>
        <input
          ref={logoInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e, "logoUrl")}
        />
        <input
          ref={sigInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleUpload(e, "signatureUrl")}
        />
      </div>

      <Card className="mx-auto max-w-[820px] bg-white text-black shadow-md print:shadow-none print:max-w-none print:border-0">
        <div className="atestado-doc px-10 py-8 print:px-12 print:py-10" style={{ fontFamily: "Garamond, 'EB Garamond', 'Times New Roman', serif" }}>
          <div className="atestado-border relative p-8 print:p-10" style={{ border: "3px double #000", boxShadow: "inset 0 0 0 1px #000" }}>
          {/* CABEÇALHO INSTITUCIONAL — texto centralizado, sem logo */}
          <header className="flex flex-col items-center text-center leading-snug mb-10 pb-4 border-b border-black">
            <h1
              {...editableProps(state.institutionName, (v) =>
                update("institutionName", v),
              )}
              className="text-[17px] font-bold outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm"
            />
            <p
              {...editableProps(state.parecer, (v) => update("parecer", v))}
              className="text-[13px] mt-1 outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm"
            />
            <p
              {...editableProps(state.cnpj, (v) => update("cnpj", v))}
              className="text-[13px] outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm"
            />
            <p
              {...editableProps(state.endereco, (v) => update("endereco", v))}
              className="text-[13px] outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm"
            />
            <p
              {...editableProps(state.contatos, (v) => update("contatos", v))}
              className="text-[13px] outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm"
            />
          </header>

          {/* CORPO — com marca d'água */}
          <section className="relative mt-8 min-h-[420px]">
            {state.logoUrl && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
                style={{ opacity: 0.08 }}
              >
                <img
                  src={state.logoUrl}
                  alt=""
                  className="max-w-[70%] max-h-[70%] object-contain"
                />
              </div>
            )}

            <div className="relative">
              <h2 className="text-center text-[16px] font-bold mb-8">
                <span style={{ textDecoration: "underline" }}>Atestado de Matrícula</span>
              </h2>

              <div
                {...editableProps(state.corpo, (v) => update("corpo", v))}
                className="text-justify leading-[1.8] text-[14px] whitespace-pre-wrap outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm min-h-[200px] indent-8"
              />
            </div>
          </section>

          {/* RODAPÉ — assinatura */}
          <footer className="mt-16 flex flex-col items-center">
            <button
              type="button"
              onClick={() => sigInput.current?.click()}
              className="block print:pointer-events-none"
              title="Clique para enviar a assinatura digitalizada"
            >
              {state.signatureUrl ? (
                <img
                  src={state.signatureUrl}
                  alt="Assinatura digitalizada"
                  className="object-contain"
                  style={{ height: 60, maxHeight: 70, width: "auto" }}
                />
              ) : (
                <div className="h-12 px-8 flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-300 rounded-md print:hidden">
                  <Upload className="h-3 w-3 mr-2" /> Enviar assinatura
                </div>
              )}
            </button>

            <p
              {...editableProps(state.responsavelNome, (v) =>
                update("responsavelNome", v),
              )}
              className="mt-1 text-[13px] text-center outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm"
            />
            <p
              {...editableProps(state.responsavelCargo, (v) =>
                update("responsavelCargo", v),
              )}
              className="text-[11px] text-neutral-700 text-center whitespace-pre-wrap outline-none focus:ring-2 focus:ring-primary/40 focus:bg-primary/5 rounded-sm"
            />
          </footer>

          {/* Rodapé Matriz dentro da borda */}
          <div className="mt-10 pt-3 border-t border-neutral-400 text-[11px] text-center">
            Matriz: Avenida Joana Angélica, 177 - Nazaré - Tel: (71) 3321-9366 / 3562-2523 / 9 9174-7744
          </div>
          </div>
        </div>
      </Card>

      <style>{`
        @media print {
          body { background: white !important; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>
    </div>
  );
}

export default AtestadoMatricula;