import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { valorPorExtensoBRL } from "../_shared/valorExtenso.ts";
import { CONTRATANTE_SIGNATURE_PNG_BASE64 } from "../_shared/contratante-signature.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_NAME = "Centro de Formação Técnica em Enfermagem Irmã Dulce";
const CONTRATANTE_BLOCK =
  "CENTRO DE FORMAÇÃO TÉCNICA EM ENFERMAGEM IRMÃ DULCE, com sede à Av. Joana Angélica, Bairro Nazaré, Nº 177, Salvador - Bahia, inscrito no CNPJ nº 007222780001-72, neste ato representado por LUCIANO KLEBER RIBEIRO CARNEIRO, brasileiro, casado, carteira de identidade nº 03.698.960-68, inscrito (a) no CPF 766.080.005-10, responsável legal do Centro de Formação Técnica em Enfermagem Irmã Dulce, doravante denominado(a) CONTRATANTE;";

function safe(v: unknown, fallback = "___"): string {
  const s = (v ?? "").toString().trim();
  return s.length ? s : fallback;
}

function brl(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function fmtDateBR(iso: string): string {
  if (!iso) return "___";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function todayBR(): string {
  const d = new Date();
  const dia = String(d.getUTCDate()).padStart(2, "0");
  const mes = String(d.getUTCMonth() + 1).padStart(2, "0");
  const ano = d.getUTCFullYear();
  return `Salvador - BA, ${dia}/${mes}/${ano}`;
}

// Helper that wraps text inside a given width using a PDF font.
function wrapText(
  text: string,
  font: any,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const test = current ? current + " " + w : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildPdf(payload: {
  professor: any;
  disciplina_nome: string;
  carga_horaria: number;
  periodo_aulas: string;
  valor_numerico: number;
  valor_extenso: string;
  turma_nome?: string | null;
  turno?: string | null;
  curso?: string | null;
  turma_data_inicio?: string | null;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);

  // Embed signature image (contratante)
  let sigImage: any = null;
  try {
    const bin = Uint8Array.from(atob(CONTRATANTE_SIGNATURE_PNG_BASE64), (c) => c.charCodeAt(0));
    sigImage = await doc.embedPng(bin);
  } catch (_) {
    sigImage = null;
  }

  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const margin = 50;
  const maxWidth = pageSize[0] - margin * 2;
  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const writeLine = (
    text: string,
    opts: { size?: number; font?: any; gap?: number; align?: "left" | "center" } = {},
  ) => {
    const sz = opts.size ?? 10.5;
    const f = opts.font ?? font;
    const gap = opts.gap ?? 4;
    if (y < margin + 60) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    let x = margin;
    if (opts.align === "center") {
      const w = f.widthOfTextAtSize(text, sz);
      x = (pageSize[0] - w) / 2;
    }
    page.drawText(text, { x, y, size: sz, font: f, color: rgb(0, 0, 0) });
    y -= sz + gap;
  };

  const writeParagraph = (
    text: string,
    opts: { size?: number; bold?: boolean; gapBefore?: number; gapAfter?: number } = {},
  ) => {
    const sz = opts.size ?? 10.5;
    const f = opts.bold ? bold : font;
    if (opts.gapBefore) y -= opts.gapBefore;
    const lines = wrapText(text, f, sz, maxWidth);
    for (const ln of lines) writeLine(ln, { size: sz, font: f, gap: 2 });
    y -= opts.gapAfter ?? 6;
  };

  // Header
  writeLine(SITE_NAME, { font: bold, size: 12, align: "center", gap: 3 });
  writeLine(
    "Avenida Joana Angélica, nº 177, Nazaré, Salvador, Bahia — Tel: 3321-9366",
    { size: 9, align: "center", gap: 2 },
  );
  writeLine(
    "Parecer CEE 340/2023 — Resolução 227/2023 D.O. 16 de Setembro de 2023 — COREN-BA n. 0038",
    { size: 9, align: "center", gap: 14 },
  );

  writeLine("CONTRATO DE TRABALHO", { font: bold, size: 14, align: "center", gap: 14 });
  writeLine("Identificação das Partes Contratantes", { font: bold, size: 11, gap: 10 });

  // Partes
  writeParagraph(`CONTRATANTE: ${CONTRATANTE_BLOCK}`);

  const p = payload.professor;
  const enderecoLinha = [
    safe(p.endereco_rua, "Rua ___"),
    safe(p.endereco_numero, "Nº ___"),
    safe(p.endereco_bairro, "Bairro ___"),
    `CEP ${safe(p.endereco_cep, "___")}`,
  ].join(", ");

  writeParagraph(
    `CONTRATADO: ${safe(p.nome).toUpperCase()}, nacionalidade brasileiro(a), estado civil ${safe(p.estado_civil)}, profissão ${safe(p.profissao)}, carteira de identidade Nº ${safe(p.rg)}, CPF Nº ${safe(p.cpf)}, residente e domiciliado na ${enderecoLinha}, Estado da Bahia.`,
  );

  // Bloco de identificação da Turma
  writeLine("IDENTIFICAÇÃO DA TURMA", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    `Turma: ${safe(payload.turma_nome)} | Turno: ${safe(payload.turno)} | Curso: ${safe(payload.curso)} | Data de Início da Turma: ${
      payload.turma_data_inicio ? fmtDateBR(payload.turma_data_inicio) : "___"
    }.`,
  );

  writeLine("DO OBJETO DO CONTRATO", { font: bold, size: 11, gap: 8 });

  writeParagraph(
    "Cláusula 1ª. As partes acima identificadas têm entre si, justo e acertado, o presente Contrato de Trabalho, que se regerá pelas cláusulas seguintes e pelas condições de preço e forma de pagamento descrito no presente.",
  );
  writeParagraph(
    "Cláusula 2ª. O CONTRATADO não terá qualquer vínculo empregatício com o CONTRATANTE, desempenhando suas atividades como profissional autônomo.",
  );

  writeLine("DAS OBRIGAÇÕES DO CONTRATADO", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    `Cláusula 3ª. O CONTRATADO será responsável por ministrar todos os serviços educacionais designados durante a carga horária contratada de ${payload.carga_horaria}h totais da disciplina contratada de "${payload.disciplina_nome}".`,
  );
  writeParagraph(
    "Parágrafo único. O período de inatividade não será considerado tempo à disposição do CONTRATANTE, podendo o CONTRATADO prestar serviços a terceiros.",
  );
  writeParagraph(
    "Cláusula 4ª. O CONTRATADO deverá seguir as normas estabelecidas pela CONTRATANTE, como horário de funcionamento, quanto à utilização de equipamentos, etc.",
  );
  writeParagraph(
    "Cláusula 5ª. O CONTRATADO se obriga a desenvolver o objeto deste contrato da maneira mais adequada e dinâmica, dando ênfase à marca e à qualidade dos serviços da CONTRATANTE.",
  );
  writeParagraph(
    "Cláusula 6ª. Os serviços a serem executados pelo CONTRATADO serão realizados no decorrer do período contratado, seguindo cronograma de execução estabelecido conjuntamente pelas partes.",
  );

  writeLine("DAS OBRIGAÇÕES DO CONTRATANTE", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    "Cláusula 7ª. A CONTRATANTE deverá fornecer ao CONTRATADO todas as informações necessárias à realização dos serviços objeto do presente instrumento, especificando os detalhes necessários à sua perfeita consecução.",
  );
  writeParagraph(
    "Cláusula 8ª. A CONTRATANTE se responsabiliza pelo bom funcionamento de equipamentos de apoio ao serviço, como também pela estrutura física de todo o ambiente de trabalho.",
  );

  writeLine("DO PAGAMENTO", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    `Cláusula 9ª. Pela prestação dos serviços acordados neste instrumento, a CONTRATANTE pagará ao CONTRATADO o valor de ${brl(payload.valor_numerico)} (${payload.valor_extenso}), da disciplina de "${payload.disciplina_nome}", no seguinte período: ${payload.periodo_aulas}, em aulas ministradas.`,
  );
  writeParagraph(
    "Parágrafo Único. Os pagamentos ao CONTRATADO serão realizados por meio de transferência bancária (PIX), cujos dados serão informados pelo mesmo.",
  );

  writeLine("DA RESCISÃO DO CONTRATO", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    "Cláusula 10ª. O presente contrato poderá ser rescindido por qualquer uma das partes a qualquer tempo, respeitando aviso prévio de 15 (quinze) dias, salvo no descumprimento pela outra parte de qualquer cláusula contratual.",
  );

  writeLine("DO PRAZO", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    "Cláusula 11ª. O presente contrato terá duração de 12 meses, podendo ser renovado a contar da data de assinatura pelas partes.",
  );

  writeLine("CONDIÇÕES GERAIS", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    "Cláusula 12ª. O CONTRATADO não possuirá horário fixo de entrada e saída na empresa, uma vez que não existirá vínculo empregatício.",
  );
  writeParagraph(
    "Cláusula 13ª. É livre ao CONTRATADO prestar serviço a outras pessoas, fora do âmbito deste contrato.",
  );

  writeLine("DO FORO", { font: bold, size: 11, gap: 8 });
  writeParagraph(
    "Cláusula 14ª. Para dirimir quaisquer controvérsias oriundas deste CONTRATO, as partes elegem o foro da comarca de Salvador - BA.",
  );

  y -= 20;
  writeLine(todayBR(), { size: 10.5, gap: 30, align: "center" });
  if (sigImage) {
    const sigW = 160;
    const sigH = (sigImage.height / sigImage.width) * sigW;
    if (y - sigH < margin + 60) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    const sigX = (pageSize[0] - sigW) / 2;
    page.drawImage(sigImage, { x: sigX, y: y - sigH + 8, width: sigW, height: sigH });
    y -= sigH - 4;
  }
  writeLine("____________________________________________", { size: 10, gap: 2, align: "center" });
  writeLine("LUCIANO KLEBER RIBEIRO CARNEIRO — Contratante", { size: 10, gap: 18, align: "center" });
  writeLine("____________________________________________", { size: 10, gap: 2, align: "center" });
  writeLine(`${safe(p.nome).toUpperCase()} — Contratado(a)`, { size: 10, gap: 4, align: "center" });

  return await doc.save();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { professor_id, disciplina_id, turma_id } = body ?? {};

    if (!professor_id || !disciplina_id) {
      return new Response(
        JSON.stringify({ error: "professor_id e disciplina_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotência: já existe um contrato 'enviado' ou 'aceito' p/ esse trio?
    const { data: existing } = await admin
      .from("contratos_professores")
      .select("id, status, token_aceite")
      .eq("user_id", userId)
      .eq("professor_id", professor_id)
      .eq("disciplina_id", disciplina_id)
      .in("status", ["enviado", "aceito"])
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({
          skipped: true,
          contrato_id: existing.id,
          status: existing.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [profRes, discRes] = await Promise.all([
      admin.from("cad_professores").select("*").eq("id", professor_id).single(),
      admin.from("disciplinas").select("*").eq("id", disciplina_id).single(),
    ]);

    if (profRes.error || !profRes.data) {
      return new Response(JSON.stringify({ error: "Professor não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (discRes.error || !discRes.data) {
      return new Response(JSON.stringify({ error: "Disciplina não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const professor = profRes.data;
    const disciplina = discRes.data;

    // Carrega dados da turma (Turma/Turno/Curso/Data Início da Turma)
    const turmaIdFinal = turma_id ?? disciplina.turma_id ?? null;
    let turmaRow: any = null;
    if (turmaIdFinal) {
      const { data: t } = await admin
        .from("turmas")
        .select("id, nome, periodo, curso, data_inicio")
        .eq("id", turmaIdFinal)
        .maybeSingle();
      turmaRow = t ?? null;
    }
    const mapTurno = (p: string | null | undefined) =>
      p === "Manhã" ? "Matutino"
      : p === "Tarde" ? "Vespertino"
      : p === "Noite" ? "Noturno"
      : p === "Sábado" ? "Intermediário"
      : (disciplina.turno ?? null);

    const carga = disciplina.carga_horaria_total || 0;
    const valor = Number((professor.valor_hora || 0) * carga);
    const valorExtenso = valorPorExtensoBRL(valor);
    const periodo = `${fmtDateBR(disciplina.data_inicio)} a ${fmtDateBR(disciplina.data_termino)}`;

    // Avisos (não bloqueia)
    const missing: string[] = [];
    if (!professor.cpf) missing.push("CPF");
    if (!professor.rg) missing.push("RG");
    if (!professor.estado_civil) missing.push("estado civil");
    if (!professor.profissao) missing.push("profissão");
    if (!professor.endereco_rua) missing.push("endereço (rua)");
    if (!professor.endereco_numero) missing.push("endereço (número)");
    if (!professor.endereco_bairro) missing.push("endereço (bairro)");
    if (!professor.endereco_cep) missing.push("endereço (CEP)");
    if (!professor.email) missing.push("e-mail");

    const pdfBytes = await buildPdf({
      professor,
      disciplina_nome: disciplina.nome,
      carga_horaria: carga,
      periodo_aulas: periodo,
      valor_numerico: valor,
      valor_extenso: valorExtenso,
      turma_nome: turmaRow?.nome ?? null,
      turno: mapTurno(turmaRow?.periodo),
      curso: turmaRow?.curso ?? disciplina.curso ?? null,
      turma_data_inicio: turmaRow?.data_inicio ?? null,
    });

    const contratoId = crypto.randomUUID();
    const storagePath = `${userId}/${contratoId}.pdf`;

    const { error: upErr } = await admin.storage
      .from("contratos")
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
    if (upErr) throw upErr;

    const tokenAceite = crypto.randomUUID();
    const { data: inserted, error: insErr } = await admin
      .from("contratos_professores")
      .insert({
        id: contratoId,
        user_id: userId,
        professor_id,
        disciplina_id,
        turma_id: turma_id ?? disciplina.turma_id ?? null,
        disciplina_nome: disciplina.nome,
        carga_horaria: carga,
        periodo_aulas: periodo,
        valor_numerico: valor,
        valor_extenso: valorExtenso,
        pdf_storage_path: storagePath,
        token_aceite: tokenAceite,
        status: "enviado",
        email_destino: professor.email || null,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // Tenta enviar e-mail via send-transactional-email (se infra estiver pronta)
    let emailSent = false;
    let emailError: string | null = null;
    if (professor.email) {
      try {
        const origin = req.headers.get("origin") ||
          "https://diariodeclasse2026.lovable.app";
        const link = `${origin}/contrato/aceite?token=${tokenAceite}`;
        const emailRes = await admin.functions.invoke("send-contract-invitation-email", {
          body: {
            to: professor.email,
            data: {
              name: professor.nome,
              disciplina: disciplina.nome,
              valor: brl(valor),
              periodo,
              cargaHoraria: carga,
              link,
            },
          },
        });
        if (emailRes.error) {
          emailError = String(emailRes.error?.message || emailRes.error);
        } else {
          emailSent = true;
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
      }
    }

    // Signed URL para visualização imediata pelo admin
    const { data: signed } = await admin.storage
      .from("contratos")
      .createSignedUrl(storagePath, 60 * 60 * 24);

    return new Response(
      JSON.stringify({
        contrato_id: inserted.id,
        token_aceite: tokenAceite,
        pdf_url: signed?.signedUrl ?? null,
        valor_numerico: valor,
        valor_extenso: valorExtenso,
        email_sent: emailSent,
        email_error: emailError,
        missing_fields: missing,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-professor-contract] error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});