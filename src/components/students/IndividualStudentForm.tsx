import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Phone, Mail, MapPin, GraduationCap, Printer, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ESTADOS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const studentSchema = z.object({
  turma_id: z.string().min(1, "Seleção de turma obrigatória"),
  matricula: z.string().min(1, "Matrícula obrigatória"),
  nome: z.string().min(1, "Nome obrigatório").max(100, "Máximo 100 caracteres"),
  data_nascimento: z.date().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  titulo_eleitoral: z.string().optional(),
  local_nascimento: z.string().optional(),
  estado_nascimento: z.string().optional(),
  nome_pai: z.string().optional(),
  nome_mae: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  endereco: z.string().optional(),
  data_matricula: z.date(),
});

type StudentFormData = z.infer<typeof studentSchema>;

export interface StudentData {
  id: string;
  matricula: string;
  nome: string;
  turma_id?: string | null;
  data_nascimento?: string | null;
  cpf?: string | null;
  rg?: string | null;
  titulo_eleitoral?: string | null;
  local_nascimento?: string | null;
  estado_nascimento?: string | null;
  nome_pai?: string | null;
  nome_mae?: string | null;
  telefone?: string | null;
  email?: string | null;
  endereco?: string | null;
  data_matricula: string;
}

interface IndividualStudentFormProps {
  onCancel: () => void;
  onSuccess: () => void;
  student?: StudentData | null;
}

export const IndividualStudentForm = ({ onCancel, onSuccess, student }: IndividualStudentFormProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!student;

  // Fetch turmas for selection
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso, periodo")
        .eq("user_id", user.id)
        .eq("status", "Ativa")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handlePrintFicha = () => {
    const v = form.getValues();
    const turma = turmas.find((t) => t.id === v.turma_id);
    const fmt = (d?: Date) => (d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "");
    const dataNasc = v.data_nascimento ? fmt(v.data_nascimento) : "";
    const dataMat = v.data_matricula ? fmt(v.data_matricula) : "";
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const logoUrl = `${window.location.origin}/logo-irma-dulce.jpeg`;
    const cursoNome = (turma as any)?.curso || "";
    const turmaNome = (turma as any)?.nome || "";
    const turno = (turma as any)?.periodo || "";
    const horario = (turma as any)?.horario || "";

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Ficha de Matrícula - ${v.nome}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color:#000; margin:0; font-size:12pt; }
  .header { text-align:center; margin-bottom:10px; }
  .header img { width:110px; height:110px; object-fit:contain; display:block; margin:0 auto 6px; }
  .header h1 { font-size:14pt; margin:0; font-weight:bold; }
  .title { text-align:center; font-size:13pt; font-weight:bold; margin:14px 0 8px; text-decoration:underline; }
  table { width:100%; border-collapse:collapse; margin-bottom:8px; }
  td, th { border:1px solid #000; padding:5px 7px; vertical-align:top; text-align:left; font-size:11pt; }
  th { background:#eee; }
  .section { font-weight:bold; background:#ddd; padding:4px 7px; border:1px solid #000; border-bottom:none; font-size:11pt; }
  .declaracao { border:1px solid #000; padding:10px; font-size:11pt; text-align:justify; margin-top:8px; line-height:1.5; }
  .assinaturas { margin-top:50px; display:flex; justify-content:space-between; gap:40px; }
  .assinatura { flex:1; text-align:center; border-top:1px solid #000; padding-top:5px; font-size:11pt; }
  .local-data { margin-top:24px; font-size:11pt; }
  @media print { .no-print { display:none; } }
  .actions { text-align:center; padding:12px; }
  .actions button { padding:8px 18px; font-size:13px; cursor:pointer; }
</style></head><body>
<div class="actions no-print">
  <button onclick="window.print()">Imprimir</button>
  <button onclick="window.close()">Fechar</button>
</div>
<div class="header">
  <img src="${logoUrl}" alt="Logo"/>
  <h1>Centro de Formação Técnica em Enfermagem Irmã Dulce</h1>
</div>
<div class="title">Ficha de Matrícula</div>

<table><tr>
  <th style="width:60%">Curso: ${cursoNome}</th>
  <th>Matrícula: ${v.matricula || ""}</th>
</tr></table>

<div class="section">Dados de Identificação do Aluno</div>
<table>
  <tr><td colspan="3">Nome: ${v.nome || ""}</td></tr>
  <tr>
    <td style="width:50%">Data de Nascimento: ${dataNasc}</td>
    <td colspan="2">Naturalidade: ${v.local_nascimento || ""}${v.estado_nascimento ? " / " + v.estado_nascimento : ""}</td>
  </tr>
  <tr><td colspan="3">Endereço Residencial: ${v.endereco || ""}</td></tr>
  <tr>
    <td>Bairro: </td>
    <td>CEP: </td>
    <td>Telefone: ${v.telefone || ""}</td>
  </tr>
  <tr>
    <td>Município: ${v.local_nascimento || ""}</td>
    <td colspan="2">UF: ${v.estado_nascimento || ""}</td>
  </tr>
  <tr>
    <td>CPF: ${v.cpf || ""}</td>
    <td>Identidade: ${v.rg || ""}</td>
    <td>Título: ${v.titulo_eleitoral || ""}</td>
  </tr>
  <tr><td colspan="3">Estabelecimento em que estudou anteriormente: </td></tr>
  <tr><td colspan="3">Endereço do Estabelecimento: </td></tr>
  <tr><td colspan="3">Formação: Geral</td></tr>
</table>

<div class="section">Filiação</div>
<table>
  <tr><td>Nome do Pai: ${v.nome_pai || ""}</td></tr>
  <tr><td>Nome da Mãe: ${v.nome_mae || ""}</td></tr>
</table>

<div class="section">Dados Funcionais do Aluno</div>
<table>
  <tr>
    <td style="width:50%">Empresa: </td>
    <td>Tempo de serviço: </td>
  </tr>
  <tr><td colspan="2">Função: </td></tr>
  <tr><td colspan="2">Endereço Comercial: </td></tr>
  <tr>
    <td>Município: </td>
    <td>Estado: / Telefone: </td>
  </tr>
  <tr><td colspan="2">Telefone de referência: ${v.telefone || ""}</td></tr>
</table>

<div class="section">Declaração</div>
<div class="declaracao">
  Vem requerer matrícula regular nesta Unidade de Ensino, no turno <b>${turno}</b> ${horario ? horario : ""}, na turma <b>${turmaNome}</b>, curso de <b>${cursoNome}</b>, declarando estar ciente do estágio para o efeito de conclusão do curso.
</div>

<div class="local-data">Salvador, ${hoje}.</div>

<div class="assinaturas">
  <div class="assinatura">Assinatura do Aluno</div>
  <div class="assinatura">Assinatura do Funcionário</div>
</div>

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 400));</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast.error("Permita pop-ups para imprimir a ficha");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const handlePrintAtestado = () => {
    const v = form.getValues();
    const turma = turmas.find((t) => t.id === v.turma_id);
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    // Carrega o template institucional editável salvo na página /atestado-matricula
    const DEFAULTS = {
      logoUrl: "",
      signatureUrl: "",
      institutionName: "INSTITUIÇÃO DE ENSINO",
      parecer: "Parecer / Credenciamento MEC nº 000/0000",
      cnpj: "CNPJ: 00.000.000/0001-00",
      endereco: "Rua Exemplo, 123 — Bairro — Cidade/UF — CEP 00000-000",
      contatos: "Tel: (00) 0000-0000 — contato@instituicao.edu.br",
      responsavelNome: "Nome do Responsável",
      responsavelCargo: "Responsável Legal",
      corpo:
        "Atestamos, para os devidos fins, que o(a) aluno(a) {{NOME_ALUNO}}, matrícula nº {{MATRICULA}}, encontra-se regularmente matriculado(a) no curso {{CURSO}}, turma {{TURMA}}, turno {{TURNO}}, com início em {{DATA_INICIO}} e término previsto em {{DATA_TERMINO}}.\n\nPor ser expressão da verdade, firmamos o presente atestado.",
    };
    let cfg = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem("atestado-matricula-v1");
      if (raw) cfg = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }

    const cursoNome = (turma as any)?.curso || "";
    const turmaNome = (turma as any)?.nome || (turma as any)?.codigo || "";
    const turno = (turma as any)?.periodo || "";
    const horario = (turma as any)?.horario || "";
    const dataInicio = (turma as any)?.data_inicio
      ? format(new Date((turma as any).data_inicio), "dd/MM/yyyy")
      : "____/____/______";
    const dataTermino = (turma as any)?.data_termino
      ? format(new Date((turma as any).data_termino), "dd/MM/yyyy")
      : "____/____/______";

    const aluno = v.nome || "_____________________";
    const matricula = v.matricula || "_______________";

    const corpoPreenchido = cfg.corpo
      .replace(/\{\{NOME_ALUNO\}\}/g, `<b>${aluno}</b>`)
      .replace(/\{\{MATRICULA\}\}/g, `<b>${matricula}</b>`)
      .replace(/\{\{CURSO\}\}/g, `<b>${cursoNome || "_____________"}</b>`)
      .replace(/\{\{TURMA\}\}/g, `<b>${turmaNome || "_____________"}</b>`)
      .replace(/\{\{TURNO\}\}/g, `<b>${turno || "_____________"}</b>${horario ? ` (${horario})` : ""}`)
      .replace(/\{\{DATA_INICIO\}\}/g, `<b>${dataInicio}</b>`)
      .replace(/\{\{DATA_TERMINO\}\}/g, `<b>${dataTermino}</b>`)
      .replace(/\n/g, "<br/>");

    const esc = (s: string) => (s || "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]);

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Atestado de Matrícula - ${aluno}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color:#000; margin:0; background:#fff; font-size:15px; line-height:1.6; }
  .actions { text-align:center; padding:10px; background:#f0f0f0; position:sticky; top:0; z-index:100; }
  .actions button { padding:8px 18px; font-size:13px; cursor:pointer; margin:0 4px; }
  .sheet { max-width: 820px; margin: 24px auto; padding: 40px 56px; background:#fff; }
  header.head { display:grid; grid-template-columns: 1fr 3fr; gap: 24px; padding-bottom:18px; border-bottom:1px solid #d4d4d4; align-items:center; }
  header.head .logo-wrap { display:flex; align-items:center; justify-content:center; }
  header.head .logo-wrap img { width:100%; max-width:140px; aspect-ratio:1/1; object-fit:contain; }
  header.head .logo-wrap .ph { width:100%; aspect-ratio:1/1; max-width:140px; border:2px dashed #ddd; border-radius:6px; }
  header.head .info h1 { font-size:18px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; margin:0 0 4px; }
  header.head .info p { margin:0; font-size:12px; color:#333; }
  section.body { position:relative; margin-top:36px; min-height:420px; }
  section.body .watermark { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:0.10; pointer-events:none; }
  section.body .watermark img { max-width:70%; max-height:70%; object-fit:contain; }
  section.body .content { position:relative; }
  section.body h2 { text-align:center; font-size:18px; font-weight:700; letter-spacing:0.3em; text-transform:uppercase; margin: 0 0 28px; }
  section.body .text { text-align:justify; line-height:1.7; font-size:15px; }
  .local-data { text-align:center; margin-top:32px; font-size:14px; }
  footer.sig { margin-top:56px; display:flex; flex-direction:column; align-items:center; }
  footer.sig img.assinatura { height:48px; width:auto; object-fit:contain; display:block; }
  footer.sig .nome { margin-top:4px; font-weight:600; font-size:15px; text-align:center; }
  footer.sig .cargo { font-size:14px; color:#444; text-align:center; }
  @media print {
    .actions { display:none; }
    body { background:#fff; }
    .sheet { margin:0; padding:0; max-width:none; }
  }
</style></head><body>
<div class="actions">
  <button onclick="window.print()">🖨️ Imprimir</button>
  <button onclick="window.close()">Fechar</button>
</div>
<div class="sheet">
  <header class="head">
    <div class="logo-wrap">
      ${cfg.logoUrl ? `<img src="${cfg.logoUrl}" alt="Logomarca"/>` : `<div class="ph"></div>`}
    </div>
    <div class="info">
      <h1>${esc(cfg.institutionName)}</h1>
      <p>${esc(cfg.parecer)}</p>
      <p>${esc(cfg.cnpj)}</p>
      <p>${esc(cfg.endereco)}</p>
      <p>${esc(cfg.contatos)}</p>
    </div>
  </header>

  <section class="body">
    ${cfg.logoUrl ? `<div class="watermark"><img src="${cfg.logoUrl}" alt=""/></div>` : ""}
    <div class="content">
      <h2>Atestado de Matrícula</h2>
      <div class="text">${corpoPreenchido}</div>
      <p class="local-data">${esc(hoje)}.</p>
    </div>
  </section>

  <footer class="sig">
    ${cfg.signatureUrl ? `<img class="assinatura" src="${cfg.signatureUrl}" alt="Assinatura"/>` : ""}
    <div class="nome">${esc(cfg.responsavelNome)}</div>
    <div class="cargo">${esc(cfg.responsavelCargo)}</div>
  </footer>
</div>
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 500));</script>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o atestado");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const handlePrintContrato = () => {
    const v = form.getValues();
    const turma = turmas.find((t) => t.id === v.turma_id);
    const fmt = (d?: Date) => (d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "");
    const dataNasc = v.data_nascimento ? fmt(v.data_nascimento) : "_____________";
    const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const logoUrl = `${window.location.origin}/logo-irma-dulce.jpeg`;
    const cursoNome = (turma as any)?.curso || "Técnico em Enfermagem";
    const turno = ((turma as any)?.periodo || "").toLowerCase();

    // Parcelas por turno (1 matrícula + N mensalidades)
    let parcelas = 25;
    if (turno.includes("manh") || turno.includes("tarde") || turno.includes("diurn")) parcelas = 23;
    else if (turno.includes("sáb") || turno.includes("sab")) parcelas = 29;
    else if (turno.includes("noi")) parcelas = 25;

    const ed = (val: string) => `<span class="editable" contenteditable="true">${val}</span>`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Contrato de Prestação de Serviços Educacionais - ${v.nome}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color:#000; margin:0; font-size:12pt; line-height:1.5; }
  .header { text-align:center; margin-bottom:18px; }
  .header img { width:90px; height:90px; object-fit:contain; display:block; margin:0 auto 6px; }
  .header h1 { font-size:13pt; margin:0; font-weight:bold; }
  h2.title { text-align:center; font-size:14pt; margin:14px 0 18px; text-decoration:underline; }
  h3 { font-size:12pt; margin:14px 0 6px; }
  p { margin:6px 0; text-align:justify; }
  .editable { background:#fff8d6; padding:1px 4px; border-bottom:1px dashed #888; outline:none; min-width:40px; display:inline-block; }
  .editable:focus { background:#fff3a3; }
  .calc { background:#e8f4ff; padding:1px 4px; border-bottom:1px dashed #5a8ec0; font-weight:bold; display:inline-block; min-width:40px; }
  .resumo { border:1px solid #000; padding:10px 14px; margin:14px 0; background:#fafafa; }
  .resumo table { width:100%; border-collapse:collapse; }
  .resumo td { padding:4px 8px; font-size:11pt; }
  .resumo td:last-child { text-align:right; font-weight:bold; }
  .assinaturas { margin-top:50px; display:flex; justify-content:space-between; gap:40px; }
  .assinatura { flex:1; text-align:center; border-top:1px solid #000; padding-top:5px; font-size:11pt; }
  @media print {
    .no-print { display:none !important; }
    .editable { background:transparent; border-bottom:none; }
    .calc { background:transparent; border-bottom:none; }
    .resumo { background:transparent; }
  }
  .actions { text-align:center; padding:12px; background:#f0f0f0; position:sticky; top:0; z-index:100; }
  .actions button { padding:8px 18px; font-size:13px; cursor:pointer; margin:0 4px; }
  .hint { background:#fffbe6; border:1px solid #e3c66b; padding:8px 12px; margin:0 0 16px; font-size:11pt; }
</style></head><body>
<div class="actions no-print">
  <button onclick="window.print()">🖨️ Imprimir</button>
  <button onclick="window.close()">Fechar</button>
  <span style="margin-left:12px;font-size:12px;color:#555">Clique nos campos destacados em amarelo para editar.</span>
</div>
<div class="hint no-print">
  Campos editáveis: <b>dados pessoais do contratante</b> no parágrafo inicial e <b>valor da matrícula / mensalidades</b> na Cláusula 4ª. O valor total e o resumo são recalculados automaticamente.
</div>

<div class="header">
  <img src="${logoUrl}" alt="Logo"/>
  <h1>Centro de Formação Técnica Dulce LTDA</h1>
  <div style="font-size:10pt">CNPJ 52.062.409/0001-36 — Rua Arquimedes Gonçalves nº 34A, Un. 11, Nazaré, Salvador-BA</div>
</div>

<h2 class="title">Contrato de Prestação de Serviços Educacionais</h2>

<p>Pelo presente instrumento particular de Contrato de Prestação de Serviços Educacionais, a Entidade Mantenedora, devidamente inscrita no CNPJ 52.062.409/0001-36, o <b>Centro de Formação Técnica Dulce LTDA</b>, com sede na Rua Arquimedes Gonçalves nº 34A, Unidade 11, Nazaré, CEP: 40.050-300, Salvador-Bahia, neste ato representada por seu representante legal, doravante denominada <b>CONTRATADA</b>, e de outro lado, ${ed(v.nome || "____________________")}, nacionalidade brasileiro(a), nascido(a) em ${ed(dataNasc)}, inscrito(a) no CPF nº ${ed(v.cpf || "_______________")}, RG nº ${ed(v.rg || "_______________")}, filho(a) de ${ed(v.nome_pai || "____________________")} e ${ed(v.nome_mae || "____________________")}, residente e domiciliado(a) em ${ed(v.endereco || "____________________")}, na cidade de ${ed(v.local_nascimento || "Salvador")}-${ed(v.estado_nascimento || "BA")}, e-mail ${ed(v.email || "_______________")}, telefone ${ed(v.telefone || "_______________")}, doravante denominado(a) <b>CONTRATANTE</b> do Curso de <b>${cursoNome}</b>, tem justo e contratado, na conformidade dos fundamentos legais adiante expostos, o seguinte:</p>

<h3>Cláusula 1ª - DO OBJETO</h3>
<p>O objeto do presente contrato é a prestação de serviços educacionais ao CONTRATANTE, para formação de técnico de enfermagem, na modalidade presencial, a ser prestado nas dependências da CONTRATADA.</p>

<h3>Cláusula 2ª - DO INÍCIO E DO PRAZO</h3>
<p>O presente contrato entrará em vigor a partir do primeiro dia de aula, com duração mínima de 22 (vinte e dois) meses no turno diurno (manhã e tarde), 24 (vinte e quatro) meses no turno noturno e 28 meses aos sábados, podendo ser prorrogado caso haja necessidade, sem prejuízo para as partes, devendo ser observado o plano e o currículo acadêmico do CONTRATANTE, com renovação da matrícula a cada seis meses.</p>
<p><b>Parágrafo 1º.</b> A prorrogação a que se refere o caput da cláusula 2ª deverá ser avisada, por escrito, ao CONTRATADO com 30 dias de antecedência.</p>

<h3>Cláusula 3ª - DA LEGISLAÇÃO APLICÁVEL À RELAÇÃO</h3>
<p>Ao firmar o presente contrato, o(a) CONTRATANTE e CONTRATADO submetem-se ao Regimento Escolar, Leis de Diretrizes e Bases Educacionais e às demais obrigações constantes na legislação aplicável à área de ensino. O aluno obriga-se a apresentar o Certificado de Conclusão do Ensino Médio e a Transferência para receber o diploma de Técnico de Enfermagem.</p>

<h3>Cláusula 4ª - DO VALOR DA MENSALIDADE</h3>
<p>Como contraprestação pelos serviços prestados descritos na cláusula 1ª, o CONTRATANTE efetuará o pagamento referente ao curso, composto da seguinte forma:</p>

<div class="resumo">
  <table>
    <tr>
      <td>Valor da <b>Matrícula</b>:</td>
      <td>R$ <span id="vMat" class="editable" contenteditable="true">355,00</span></td>
    </tr>
    <tr>
      <td>Valor de cada <b>Mensalidade</b>:</td>
      <td>R$ <span id="vMens" class="editable" contenteditable="true">435,00</span></td>
    </tr>
    <tr>
      <td>Quantidade de Prestações (mensalidades): <span class="calc" id="qtdMens">${parcelas}</span> &nbsp; <small>(turno: ${turno || "—"})</small></td>
      <td>Subtotal mensalidades: R$ <span class="calc" id="subMens">0,00</span></td>
    </tr>
    <tr style="border-top:1px solid #000">
      <td><b>VALOR TOTAL DO CURSO</b> (matrícula + ${parcelas} mensalidades):</td>
      <td>R$ <span class="calc" id="vTotal" style="font-size:13pt">0,00</span></td>
    </tr>
  </table>
</div>

<p>O CONTRATANTE efetuará o pagamento do valor total de <b>R$ <span class="calc" id="vTotalInline">0,00</span></b> (<span class="calc" id="vTotalExt">—</span>), que será pago em <span class="calc" id="qtdMensInline">${parcelas}</span> prestações mensais no valor de <b>R$ <span class="calc" id="vMensInline">0,00</span></b> cada, tendo o(a) CONTRATANTE efetuado o pagamento de <b>R$ <span class="calc" id="vMatInline">0,00</span></b> referente à matrícula.</p>

<p><b>Parágrafo 1º.</b> O valor do curso e da mensalidade poderão sofrer reajuste de acordo com o regime econômico vigente, atualizados em 1º de janeiro, anualmente, consoante à variação do IGP-DI da Fundação Getúlio Vargas.</p>
<p><b>Parágrafo 2º.</b> A matrícula só será considerada realizada com o efetivo pagamento do valor descrito no caput da cláusula 4ª, não alterando a duração mínima do curso.</p>
<p><b>Parágrafo 3º.</b> Caso o CONTRATANTE desista da contratação antes do início das aulas, será cobrada multa de 10% a 25% sobre o valor da matrícula, a depender do prazo.</p>
<p><b>Parágrafo 4º.</b> Caso a desistência/rescisão ocorra após o início das aulas, haverá a retenção do percentual de 25% do montante efetivamente pago pelo contratante.</p>
<p><b>Parágrafo 5º.</b> Os valores não cobrem material escolar, transporte e alimentação.</p>
<p><b>Parágrafo 6º.</b> Composição do curso por turno: (A) Diurno — 23 parcelas (1 matrícula + 23); (B) Noturno — 25 parcelas (1 matrícula + 25); (C) Sábados — 29 parcelas (1 matrícula + 29).</p>

<h3>Cláusula 5ª - DO VENCIMENTO</h3>
<p>O vencimento das mensalidades dar-se-á sempre do dia 30 do mês vigente ao dia 5 do mês subsequente. Em caso de falta de pagamento no vencimento, o valor será acrescido de multa de 2% e juros de 1% ao mês.</p>

<h3>Cláusula 6ª - DA COBERTURA DAS MENSALIDADES</h3>
<p>Os valores fixados destinam-se à cobertura das aulas teóricas, práticas, estágios e visitas técnicas, não incluindo transporte, alimentação, uniformes, material didático e taxas da Cláusula 10ª.</p>

<h3>Cláusula 7ª - DA RESPONSABILIDADE DO CONTRATANTE</h3>
<p>O CONTRATANTE compromete-se a cumprir as tarefas didático-pedagógicas, frequentar as aulas, submeter-se às avaliações de aprendizagem e participar das atividades de formação conforme calendário e horários da CONTRATADA.</p>

<h3>Cláusula 8ª - DA 2ª CHAMADA</h3>
<p>Ocorrendo falta do aluno à avaliação, o mesmo poderá submeter-se à 2ª chamada, desde que justificado e comprovado o motivo da ausência e efetuado o pagamento da taxa conforme cláusula 10ª, “a”.</p>

<h3>Cláusula 9ª - DA TRANSFERÊNCIA</h3>
<p>Fica a cargo da CONTRATADA avaliar pedido de transferência de turma/turno, mediante disponibilidade e equivalência de período, com pagamento antecipado da respectiva taxa.</p>

<h3>Cláusula 10ª - DAS TAXAS E SERVIÇOS</h3>
<p>Os valores das taxas e serviços terão como referência a mensalidade vigente à época, cobrados nos seguintes percentuais/valores: segunda chamada 10% por disciplina; 2ª via de documento de conclusão e transferências 35%; atestados, declarações e 2ª via de carnês 7%; repetência de disciplina 50%; reposição de estágio R$ 120,00/dia; repetir estágio R$ 260,00 + mensalidade; transferência de turma/turnos 30%; transferência para outras escolas 50%; taxa de rematrícula R$ 180,00 a cada 6 meses; taxa do primeiro estágio R$ 230,00.</p>

<h3>Cláusula 11ª - DA INADIMPLÊNCIA</h3>
<p>Em caso de inadimplência por 30 dias ou mais, a CONTRATADA encaminhará os dados do CONTRATANTE ao cadastro de consumidor, nos termos do art. 43, §2º, da Lei 8.078/90.</p>

<h3>Cláusula 12ª - DA RESCISÃO</h3>
<p>O contrato poderá ser rescindido (a) pelo aluno: por desistência formal escrita, com restituição proporcional se pagamento integral antecipado, ou multa de 25% no caso de pagamento mensal; (b) pela CONTRATADA: por desligamento conforme Regimento, falta de decoro ou conduta antiética.</p>

<h3>Cláusula 13ª - DO TRANCAMENTO</h3>
<p>O CONTRATANTE poderá trancar o curso por até 30 dias, uma vez por ano (diurno/noturno) ou uma vez no prazo total (sábados), mediante solicitação formal.</p>

<h3>Cláusula 14ª - DA OBRIGATORIEDADE DO USO DO UNIFORME</h3>
<p>Uniforme obrigatório composto por blusa branca padronizada, calça comprida branca, sapato branco fechado, jaleco e roupa privativa, conforme regras de locação, devolução e taxas.</p>

<h3>Cláusula 15ª - DOS OBJETOS PESSOAIS E PROIBIÇÃO DE ELETRÔNICOS</h3>
<p>A CONTRATADA não se responsabiliza por pertences pessoais. É proibido o uso de celulares e similares em sala de aula, estágios ou atividades extracurriculares.</p>

<h3>Cláusula 16ª - DO DIPLOMA</h3>
<p>O aluno deverá cursar todas as disciplinas e estágios. Em caso de reprovação, repete-se a disciplina mediante taxa de 25% sobre a mensalidade vigente.</p>

<h3>Cláusula 17ª - DOS ESTÁGIOS SUPERVISIONADOS</h3>
<p>Estágios supervisionados em hospitais e clínicas, conforme programação, são obrigatórios para conclusão. Reprovação implica repetição mediante taxa de 25% da mensalidade.</p>

<h3>Cláusula 18ª - DA RENOVAÇÃO DA MATRÍCULA</h3>
<p>Renovação a cada 6 meses, mediante quitação das mensalidades e pagamento de taxa de R$ 60,00.</p>

<h3>Cláusula 19ª - DO CADASTRO DO SALVADORCARD</h3>
<p>Cadastro dos alunos no Salvador Card de fevereiro a outubro de cada ano.</p>

<h3>Cláusula 20ª - DO NÚMERO MÍNIMO DE ALUNOS</h3>
<p>A CONTRATADA reserva-se ao direito de iniciar turmas com no mínimo 20 alunos matriculados, podendo haver alteração com aviso prévio.</p>

<h3>Cláusula 21ª - DOS PREJUÍZOS E DA RESPONSABILIDADE</h3>
<p>O CONTRATANTE responde por prejuízos morais ou materiais causados à CONTRATADA ou a terceiros, nos termos do art. 927 do Código Civil.</p>

<h3>Cláusula 22ª - DAS OBRIGAÇÕES DO CONTRATANTE</h3>
<p>Portar-se adequadamente; tratar todos com urbanidade; cumprir horários; participar das aulas com material; respeitar colegas e professores; comunicar à secretaria fatos relevantes; pagar mensalidades e taxas em dia; zelar pelo contrato; apresentar documentos; usar uniforme.</p>

<h3>Cláusula 23ª - DAS OBRIGAÇÕES DO CONTRATADO</h3>
<p>Fornecer informações necessárias; oferecer ambiente limpo e digno; tratar o CONTRATANTE com zelo; cumprir horários; fornecer material mediante taxa; manter canais efetivos de comunicação; comunicar situações que impossibilitem o serviço.</p>

<h3>Cláusula 24ª - DO CONHECIMENTO DAS CLÁUSULAS</h3>
<p>O CONTRATANTE declara ter pleno conhecimento de todas as cláusulas e condições deste contrato, observados os artigos 46 a 48 da Lei 8.078/90.</p>

<h3>Cláusula 25ª - DA FORÇA EXECUTIVA</h3>
<p>As partes atribuem ao presente contrato plena eficácia e força executiva extrajudicial.</p>

<h3>Cláusula 26ª - DO FORO</h3>
<p>Fica eleito o foro da Comarca de Salvador-BA para dirimir quaisquer dúvidas decorrentes deste contrato, podendo o contratante ajuizar demandas em seu domicílio, caso prefira.</p>

<p style="margin-top:24px">E por estarem justos e contratados, assinam o presente instrumento, na presença de testemunhas abaixo, para que produza todos seus efeitos legais.</p>

<p style="margin-top:24px">Salvador, ${hoje}.</p>

<div class="assinaturas">
  <div class="assinatura">CONTRATANTE<br/>(Aluno(a) / Responsável)</div>
  <div class="assinatura">CONTRATADA<br/>(Diretor(a) / Responsável)</div>
</div>
<div class="assinaturas" style="margin-top:40px">
  <div class="assinatura">Testemunha 1</div>
  <div class="assinatura">Testemunha 2</div>
</div>

<script>
  const PARCELAS = ${parcelas};
  const parseBR = (s) => {
    if (!s) return 0;
    const n = parseFloat(String(s).replace(/\\./g,'').replace(',','.').replace(/[^0-9.]/g,''));
    return isNaN(n) ? 0 : n;
  };
  const fmtBR = (n) => n.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const extenso = (n) => {
    // Simples: apenas exibe "valor por extenso" com o número arredondado em palavras curtas
    try {
      const inteiro = Math.floor(n);
      const cent = Math.round((n-inteiro)*100);
      return inteiro.toLocaleString('pt-BR') + ' reais' + (cent? ' e ' + cent + ' centavos':'');
    } catch(e){ return ''; }
  };
  function recalc(){
    const mat = parseBR(document.getElementById('vMat').innerText);
    const mens = parseBR(document.getElementById('vMens').innerText);
    const sub = mens * PARCELAS;
    const total = mat + sub;
    document.getElementById('subMens').innerText = fmtBR(sub);
    document.getElementById('vTotal').innerText = fmtBR(total);
    document.getElementById('vTotalInline').innerText = fmtBR(total);
    document.getElementById('vTotalExt').innerText = extenso(total);
    document.getElementById('vMensInline').innerText = fmtBR(mens);
    document.getElementById('vMatInline').innerText = fmtBR(mat);
  }
  ['vMat','vMens'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', recalc);
    el.addEventListener('blur', recalc);
  });
  recalc();
</script>
</body></html>`;

    const w = window.open("", "_blank", "width=1000,height=1000");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o contrato");
      return;
    }
    w.document.write(html);
    w.document.close();
  };

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      matricula: student?.matricula || "",
      nome: student?.nome || "",
      turma_id: student?.turma_id || "",
      cpf: student?.cpf || "",
      rg: student?.rg || "",
      titulo_eleitoral: student?.titulo_eleitoral || "",
      local_nascimento: student?.local_nascimento || "",
      estado_nascimento: student?.estado_nascimento || "",
      nome_pai: student?.nome_pai || "",
      nome_mae: student?.nome_mae || "",
      telefone: student?.telefone || "",
      email: student?.email || "",
      endereco: student?.endereco || "",
      data_nascimento: student?.data_nascimento ? new Date(student.data_nascimento) : undefined,
      data_matricula: student?.data_matricula ? new Date(student.data_matricula) : new Date(),
    },
  });

  const onSubmit = async (data: StudentFormData) => {
    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setIsLoading(true);
    try {
      const studentData = {
        matricula: data.matricula,
        nome: data.nome,
        turma_id: data.turma_id || null,
        data_nascimento: data.data_nascimento ? format(data.data_nascimento, "yyyy-MM-dd") : null,
        cpf: data.cpf || null,
        rg: data.rg || null,
        titulo_eleitoral: data.titulo_eleitoral || null,
        local_nascimento: data.local_nascimento || null,
        estado_nascimento: data.estado_nascimento || null,
        nome_pai: data.nome_pai || null,
        nome_mae: data.nome_mae || null,
        telefone: data.telefone || null,
        email: data.email || null,
        endereco: data.endereco || null,
        data_matricula: format(data.data_matricula, "yyyy-MM-dd"),
      };

      if (isEditing && student) {
        const { error } = await supabase
          .from("students")
          .update(studentData)
          .eq("id", student.id);
        if (error) throw error;
        toast.success("Estudante atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("students").insert({
          ...studentData,
          user_id: user.id,
        });
        if (error) throw error;
        toast.success("Estudante adicionado com sucesso!");
      }

      onSuccess();
    } catch (error: any) {
      console.error("Error saving student:", error);
      toast.error(error.message || "Erro ao salvar estudante");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Dados Pessoais */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Dados Pessoais
        </h3>

        {/* Seleção de Turma - Campo obrigatório logo abaixo do título */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Turma *
          </Label>
          <Select
            value={form.watch("turma_id")}
            onValueChange={(value) => form.setValue("turma_id", value)}
          >
            <SelectTrigger className={cn(
              form.formState.errors.turma_id && "border-destructive"
            )}>
              <SelectValue placeholder="Selecione a turma do estudante" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {turmas.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma turma cadastrada
                </div>
              ) : (
                turmas.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome} {turma.curso ? `- ${turma.curso}` : ""} {turma.periodo ? `(${turma.periodo})` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {form.formState.errors.turma_id && (
            <p className="text-sm text-destructive">{form.formState.errors.turma_id.message}</p>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="matricula">Número de Matrícula *</Label>
            <Input
              id="matricula"
              placeholder="Ex: 2024001"
              {...form.register("matricula")}
            />
            {form.formState.errors.matricula && (
              <p className="text-sm text-destructive">{form.formState.errors.matricula.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              placeholder="Nome do estudante"
              {...form.register("nome")}
            />
            {form.formState.errors.nome && (
              <p className="text-sm text-destructive">{form.formState.errors.nome.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data de Nascimento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.watch("data_nascimento") && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("data_nascimento") ? (
                    format(form.watch("data_nascimento")!, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    "Selecione a data"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-popover" align="start">
                <Calendar
                  mode="single"
                  selected={form.watch("data_nascimento")}
                  onSelect={(date) => form.setValue("data_nascimento", date)}
                  initialFocus
                  locale={ptBR}
                  className="pointer-events-auto"
                  captionLayout="dropdown-buttons"
                  fromYear={1940}
                  toYear={new Date().getFullYear()}
                  defaultMonth={form.watch("data_nascimento") || new Date(2005, 0, 1)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              {...form.register("cpf")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rg">Identidade (RG)</Label>
            <Input
              id="rg"
              placeholder="00.000.000-0"
              {...form.register("rg")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="titulo_eleitoral">Título Eleitoral</Label>
            <Input
              id="titulo_eleitoral"
              placeholder="0000 0000 0000"
              {...form.register("titulo_eleitoral")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="local_nascimento">Local de Nascimento</Label>
            <Input
              id="local_nascimento"
              placeholder="Cidade"
              {...form.register("local_nascimento")}
            />
          </div>

          <div className="space-y-2">
            <Label>Estado de Nascimento</Label>
            <Select
              value={form.watch("estado_nascimento")}
              onValueChange={(value) => form.setValue("estado_nascimento", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estado" />
              </SelectTrigger>
              <SelectContent className="bg-popover">
                {ESTADOS_BR.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {estado}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Filiação */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Filiação
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nome_pai">Nome do Pai</Label>
            <Input
              id="nome_pai"
              placeholder="Nome completo"
              {...form.register("nome_pai")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome_mae">Nome da Mãe</Label>
            <Input
              id="nome_mae"
              placeholder="Nome completo"
              {...form.register("nome_mae")}
            />
          </div>
        </div>
      </div>

      {/* Contato */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Contato
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="telefone"
                placeholder="(00) 00000-0000"
                className="pl-10"
                {...form.register("telefone")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                className="pl-10"
                {...form.register("email")}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="endereco">Endereço</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="endereco"
              placeholder="Rua, número, bairro, cidade"
              className="pl-10"
              {...form.register("endereco")}
            />
          </div>
        </div>
      </div>

      {/* Matrícula */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Matrícula
        </h3>
        
        <div className="space-y-2">
          <Label>Data de Matrícula *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !form.watch("data_matricula") && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {form.watch("data_matricula") ? (
                  format(form.watch("data_matricula"), "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  "Selecione a data"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-popover" align="start">
              <Calendar
                mode="single"
                selected={form.watch("data_matricula")}
                onSelect={(date) => date && form.setValue("data_matricula", date)}
                initialFocus
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t">
        {isEditing && (
          <>
            <Button type="button" variant="secondary" onClick={handlePrintFicha} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Ficha de Matrícula
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrintContrato} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Imprimir Contrato
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrintAtestado} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Imprimir Atestado de Matrícula
            </Button>
          </>
        )}
        <Button type="button" variant="outline" onClick={onCancel} className="w-full">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Salvando..." : isEditing ? "Atualizar Estudante" : "Salvar Estudante"}
        </Button>
      </div>
    </form>
  );
};
