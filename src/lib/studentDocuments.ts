import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export interface StudentDocData {
  nome?: string | null;
  matricula?: string | null;
  data_nascimento?: string | Date | null;
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
  data_matricula?: string | Date | null;
}

export interface TurmaDocData {
  nome?: string | null;
  curso?: string | null;
  periodo?: string | null;
  horario?: string | null;
}

const toDate = (v?: string | Date | null): Date | undefined => {
  if (!v) return undefined;
  if (v instanceof Date) return v;
  const [y, m, d] = String(v).split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

const openPrintWindow = (html: string, title: string, width = 900) => {
  const w = window.open("", "_blank", `width=${width},height=1000`);
  if (!w) {
    toast.error(`Permita pop-ups para imprimir ${title}`);
    return;
  }
  w.document.write(html);
  w.document.close();
};

export const printFichaMatricula = (v: StudentDocData, turma?: TurmaDocData | null) => {
  const fmt = (d?: Date) => (d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "");
  const dataNasc = fmt(toDate(v.data_nascimento));
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const logoUrl = `${window.location.origin}/logo-irma-dulce.jpeg`;
  const cursoNome = turma?.curso || "";
  const turmaNome = turma?.nome || "";
  const turno = turma?.periodo || "";
  const horario = turma?.horario || "";

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Ficha de Matrícula - ${v.nome ?? ""}</title>
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

  openPrintWindow(html, "a ficha");
};

export const printContratoMatricula = (v: StudentDocData, turma?: TurmaDocData | null) => {
  const fmt = (d?: Date) => (d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "");
  const dataNasc = fmt(toDate(v.data_nascimento)) || "_____________";
  const hoje = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const logoUrl = `${window.location.origin}/logo-irma-dulce.jpeg`;
  const cursoNome = turma?.curso || "Técnico em Enfermagem";
  const turno = (turma?.periodo || "").toLowerCase();

  let parcelas = 25;
  if (turno.includes("manh") || turno.includes("tarde") || turno.includes("diurn")) parcelas = 23;
  else if (turno.includes("sáb") || turno.includes("sab")) parcelas = 29;
  else if (turno.includes("noi")) parcelas = 25;

  const ed = (val: string) => `<span class="editable" contenteditable="true">${val}</span>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Contrato de Prestação de Serviços Educacionais - ${v.nome ?? ""}</title>
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
<p>Ocorrendo falta do aluno à avaliação, o mesmo poderá submeter-se à 2ª chamada, desde que justificado e comprovado o motivo da ausência e efetuado o pagamento da taxa conforme cláusula 10ª, "a".</p>

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

  openPrintWindow(html, "o contrato", 1000);
};