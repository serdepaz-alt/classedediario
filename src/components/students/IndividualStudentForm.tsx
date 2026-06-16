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
import { CalendarIcon, Phone, Mail, MapPin, GraduationCap, Printer, FileText, UserX } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const parseDateOnly = (value?: string | null) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

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

  const handleInativarTurma = async () => {
    if (!student) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("students")
        .update({ turma_id: null, status: "Inativo" })
        .eq("id", student.id);
      if (error) throw error;
      toast.success("Aluno inativado da turma");
      onSuccess();
    } catch (e: unknown) {
      console.error(e);
      toast.error(getErrorMessage(e, "Erro ao inativar aluno"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch turmas for selection
  const { data: turmas = [] } = useQuery({
    queryKey: ["turmas", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("turmas")
        .select("id, nome, curso, periodo, horario")
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
    const cursoNome = turma?.curso || "";
    const turmaNome = turma?.nome || "";
    const turno = turma?.periodo || "";
    const horario = turma?.horario || "";

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
    const logoUrl = `${window.location.origin}/logo-irma-dulce.jpeg`;
    const assinaturaUrl = `${window.location.origin}/assinatura-luciano.png`;
    const cursoNome = turma?.curso || "";
    const turno = turma?.periodo || "";
    const horario = turma?.horario || "";

    const genero = (v.nome_mae || v.nome_pai) ? "" : "";
    const aluno = v.nome || "_____________________";
    const cpf = v.cpf || "___.___.___-__";
    const matricula = v.matricula || "_______________";
    const mae = v.nome_mae || "_____________________";
    const pai = v.nome_pai || "_____________________";
    const filiacao = [mae, pai].filter((s) => s && s.trim()).join(" e ") || "_____________________";

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Atestado de Matrícula - ${aluno}</title>
<style>
  @page { size: A4; margin: 16mm 18mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Garamond, 'Times New Roman', serif; color:#000; margin:0; font-size:11pt; line-height:1.45; }
  .header { display:grid; grid-template-columns:32mm 1fr; align-items:center; gap:8mm; padding-bottom:5mm; margin-bottom:14mm; border-bottom:2px solid #000; }
  .logo-box { width:32mm; height:32mm; display:flex; align-items:center; justify-content:center; }
  .header img.logo { max-width:32mm; max-height:32mm; object-fit:contain; display:block; }
  .institution { text-align:center; line-height:1.2; }
  .institution .name { font-weight:bold; font-size:13pt; margin:0 0 1.5mm; }
  .institution .line { font-size:9.5pt; margin:0; }
  h1.title { text-align:center; font-style:italic; font-weight:bold; font-size:14pt; text-decoration:underline; margin:0 0 9mm; }
  p.body { text-align:justify; text-indent:1.5em; margin:0 0 8mm; }
  .local-data { text-align:center; font-weight:bold; margin:10mm 0 14mm; }
  .assinatura-bloco { text-align:center; margin-top:4mm; }
  .assinatura-bloco img { width:90mm; height:auto; display:block; margin:0 auto 1mm; }
  .assinatura-bloco .carimbo { display:block; font-family:Garamond,'Times New Roman',serif; font-weight:bold; font-size:14pt; color:#000; margin-top:0; }
  .assinatura-bloco .carimbo-sub { display:block; font-family:Garamond,'Times New Roman',serif; font-style:italic; font-size:10pt; color:#000; line-height:1.3; margin-top:1mm; }
  @media print { .no-print { display:none; } }
  .actions { text-align:center; padding:12px; background:#f0f0f0; position:sticky; top:0; z-index:100; }
  .actions button { padding:8px 18px; font-size:13px; cursor:pointer; margin:0 4px; }
</style></head><body>
<div class="actions no-print">
  <button onclick="window.print()">🖨️ Imprimir</button>
  <button onclick="window.close()">Fechar</button>
</div>
<header class="header">
  <div class="logo-box"><img class="logo" src="${logoUrl}" alt="Logomarca"/></div>
  <div class="institution">
    <p class="name">Centro de Formação Técnica em Enfermagem Irmã Dulce</p>
    <p class="line">Parecer CEE nº 228/2024 – Resolução CEE, nº 228/2024 D.O. 16/09/2024</p>
    <p class="line">CNPJ 52.062.409/0001-36</p>
    <p class="line">Rua Arquimedes Gonçalves, nº 313, Nazaré, Salvador, Bahia</p>
    <p class="line">Telefone: 3321-9366 / 3561-2523</p>
  </div>
</header>
<h1 class="title">Atestado de Matrícula</h1>

<p class="body">Atestado para devidos fins que o(a) aluno(a) <b>${aluno}</b>, CPF <b>${cpf}</b>, Matrícula: <b>${matricula}</b>, filho(a) de ${filiacao}, está matriculado(a) no curso <b>${cursoNome || "_____________________"}</b> nesse estabelecimento de Ensino, no turno <b>${turno || "_______"}</b>${horario ? `, no horário <b>${horario}</b>` : ""}.</p>

<p class="local-data">Salvador, ${hoje}.</p>

<div class="assinatura-bloco">
  <img src="${assinaturaUrl}" alt="Assinatura"/>
  <div class="carimbo">Responsável Legal</div>
  <div class="carimbo-sub">Centro de Form. Técnica em<br/>Enfermagem Irmã Dulce<br/>Luciano Kleber C. Ribeiro</div>
</div>

<script>
  window.addEventListener('load', () => {
    const images = Array.from(document.images);
    Promise.all(images.map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    }))).then(() => setTimeout(() => window.print(), 300));
  });
</script>
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
    const cursoNome = turma?.curso || "Técnico em Enfermagem";
    const turno = (turma?.periodo || "").toLowerCase();

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

  const handlePrintAll = () => {
    handlePrintFicha();
    setTimeout(() => handlePrintAtestado(), 800);
    setTimeout(() => handlePrintContrato(), 1600);
    toast.success("Abrindo todos os documentos para impressão");
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
      data_nascimento: parseDateOnly(student?.data_nascimento),
      data_matricula: parseDateOnly(student?.data_matricula) || new Date(),
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
        status: data.turma_id ? "Ativo" : "Inativo",
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
    } catch (error: unknown) {
      console.error("Error saving student:", error);
      toast.error(getErrorMessage(error, "Erro ao salvar estudante"));
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
          <div className="flex gap-2">
            <Select
              value={form.watch("turma_id")}
              onValueChange={(value) => form.setValue("turma_id", value)}
            >
              <SelectTrigger className={cn(
                "flex-1",
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
            {isEditing && student?.turma_id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={isLoading}>
                    <UserX className="h-4 w-4 mr-1" />
                    Inativar da Turma
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Inativar aluno da turma?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O aluno será desvinculado da turma atual e marcado como Inativo.
                      Esta ação pode ser revertida selecionando uma nova turma posteriormente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleInativarTurma}>
                      Confirmar Inativação
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
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
      <div className="space-y-3 pt-4 border-t">
        {isEditing && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button type="button" variant="secondary" onClick={handlePrintFicha} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Ficha de Matrícula
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrintContrato} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Contrato
            </Button>
            <Button type="button" variant="secondary" onClick={handlePrintAtestado} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Atestado de Matrícula
            </Button>
            <Button type="button" variant="default" onClick={handlePrintAll} className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir Tudo
            </Button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full">
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? "Salvando..." : isEditing ? "Atualizar Estudante" : "Salvar Estudante"}
          </Button>
        </div>
      </div>
    </form>
  );
};
