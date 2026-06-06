import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAKE_WEBHOOK_URL =
  Deno.env.get("MAKE_WEBHOOK_URL") ??
  "https://hook.us2.make.com/rqunmuefa25z96mbnf2ifulhsfsryfwp";

const DEFAULT_WHATSAPP = "5571991747744";
const EMAIL_CENTRAL = "salasdeaulairmadulce@gmail.com";
const DRIVE_FOLDER_NAME = "Contratos Professores - Diário de Classe";

function mapTurno(p: string | null | undefined): string | null {
  switch (p) {
    case "Manhã": return "Matutino";
    case "Tarde": return "Vespertino";
    case "Noite": return "Noturno";
    case "Sábado": return "Intermediário";
    default: return null;
  }
}

function stripAccentsSafe(s: string): string {
  return (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return "-";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

function wrapText(text: string, font: any, size: number, maxWidth: number): string[] {
  const words = (text ?? "").split(/\s+/);
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

async function buildPlanoAulasPDF(opts: {
  disciplina: string;
  professor: string;
  turma: string;
  curso: string;
  turno: string;
  cargaHoraria: string | number | null;
  periodo: string | null;
  aulas: Array<{
    data: string | null;
    topico: string | null;
    objetivo: string | null;
    metodologia: string | null;
    recursos: string | null;
    observacoes: string | null;
    tipo: string | null;
  }>;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89]; // A4
  const margin = 50;
  const maxWidth = pageSize[0] - margin * 2;
  let page = doc.addPage(pageSize);
  let y = pageSize[1] - margin;

  const writeLine = (
    text: string,
    o: { size?: number; bold?: boolean; gap?: number; align?: "left" | "center" } = {},
  ) => {
    const sz = o.size ?? 10.5;
    const f = o.bold ? bold : font;
    const gap = o.gap ?? 3;
    if (y < margin + 40) {
      page = doc.addPage(pageSize);
      y = pageSize[1] - margin;
    }
    let x = margin;
    const safe = stripAccentsSafe(text);
    if (o.align === "center") {
      const w = f.widthOfTextAtSize(safe, sz);
      x = (pageSize[0] - w) / 2;
    }
    page.drawText(safe, { x, y, size: sz, font: f, color: rgb(0, 0, 0) });
    y -= sz + gap;
  };

  const writePara = (text: string, o: { size?: number; bold?: boolean; gapAfter?: number } = {}) => {
    const sz = o.size ?? 10.5;
    const f = o.bold ? bold : font;
    const lines = wrapText(stripAccentsSafe(text), f, sz, maxWidth);
    for (const ln of lines) writeLine(ln, { size: sz, bold: o.bold, gap: 2 });
    y -= o.gapAfter ?? 4;
  };

  writeLine("CONTEUDO PROGRAMATICO - PLANO DE AULAS", { size: 14, bold: true, align: "center", gap: 10 });
  writeLine(`Disciplina: ${opts.disciplina}`, { size: 11, bold: true });
  writeLine(`Professor(a): ${opts.professor}`, { size: 10.5 });
  writeLine(`Turma: ${opts.turma}  |  Curso: ${opts.curso}  |  Turno: ${opts.turno}`, { size: 10.5 });
  writeLine(`Carga horaria: ${opts.cargaHoraria ?? "-"}h  |  Periodo: ${opts.periodo ?? "-"}`, { size: 10.5, gap: 8 });
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: pageSize[0] - margin, y: y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 10;

  if (!opts.aulas.length) {
    writePara("Nenhuma aula cadastrada para esta disciplina.");
  } else {
    opts.aulas.forEach((a, i) => {
      if (y < margin + 80) { page = doc.addPage(pageSize); y = pageSize[1] - margin; }
      writeLine(`Aula ${i + 1}${a.data ? ` - ${fmtDateBR(a.data)}` : ""}`, { size: 11.5, bold: true, gap: 3 });
      if (a.topico) writePara(`Topico: ${a.topico}`, { gapAfter: 2 });
      if (a.objetivo) writePara(`Objetivo: ${a.objetivo}`, { gapAfter: 2 });
      if (a.metodologia) writePara(`Metodologia: ${a.metodologia}`, { gapAfter: 2 });
      if (a.recursos) writePara(`Recursos: ${a.recursos}`, { gapAfter: 2 });
      if (a.tipo) writePara(`Tipo: ${a.tipo}`, { gapAfter: 2 });
      if (a.observacoes) writePara(`Observacoes: ${a.observacoes}`, { gapAfter: 2 });
      y -= 6;
    });
  }

  return await doc.save();
}

async function postToMake(payload: Record<string, unknown>) {
  try {
    await fetch(MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Make webhook failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { token, action } = await req.json().catch(() => ({}));
    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: contrato, error: fetchErr } = await admin
      .from("contratos_professores")
      .select("*")
      .eq("token_aceite", token)
      .maybeSingle();
    if (fetchErr || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato inválido" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (contrato.status === "aceito") {
      return new Response(
        JSON.stringify({ ok: true, already: true, status: "aceito" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const novoStatus = action === "recusar" ? "recusado" : "aceito";
    const updates: Record<string, unknown> = { status: novoStatus };
    if (novoStatus === "aceito") {
      updates.aceito_em = new Date().toISOString();
      updates.aceito_ip = ip;
    } else {
      updates.recusado_em = new Date().toISOString();
    }

    const { error: upErr } = await admin
      .from("contratos_professores")
      .update(updates)
      .eq("id", contrato.id);
    if (upErr) throw upErr;

    // Carrega dados do professor para enriquecer o webhook
    const { data: professor } = await admin
      .from("cad_professores")
      .select("nome, email, telefone, telefone2")
      .eq("id", contrato.professor_id)
      .maybeSingle();

    // Carrega dados da Turma para enriquecer payload e PDF
    let turmaInfo: any = null;
    if (contrato.turma_id) {
      const { data: t } = await admin
        .from("turmas")
        .select("id, nome, periodo, curso, data_inicio")
        .eq("id", contrato.turma_id)
        .maybeSingle();
      turmaInfo = t ?? null;
    }

    // Carrega disciplina para data_inicio/data_termino do evento
    let discInfo: any = null;
    if (contrato.disciplina_id) {
      const { data: d } = await admin
        .from("disciplinas")
        .select("data_inicio, data_termino")
        .eq("id", contrato.disciplina_id)
        .maybeSingle();
      discInfo = d ?? null;
    }

    const turmaPayload = {
      turma_id: contrato.turma_id ?? null,
      turma_nome: turmaInfo?.nome ?? null,
      turno: mapTurno(turmaInfo?.periodo),
      curso: turmaInfo?.curso ?? null,
      turma_data_inicio: turmaInfo?.data_inicio ?? null,
    };

    if (novoStatus === "aceito") {
      // Busca todos os planos de aula vinculados à disciplina
      let { data: planos } = await admin
        .from("conteudo_programatico_aulas")
        .select(
          "id, data_aula, topico, objetivo, metodologia, recursos, observacoes, tipo_avaliacao, disciplina_nome",
        )
        .eq("disciplina_id", contrato.disciplina_id)
        .order("data_aula", { ascending: true });

      // Fallback 1: por turma + nome da disciplina (case-insensitive)
      if ((!planos || planos.length === 0) && contrato.disciplina_nome) {
        const q = admin
          .from("conteudo_programatico_aulas")
          .select(
            "id, data_aula, topico, objetivo, metodologia, recursos, observacoes, tipo_avaliacao, disciplina_nome",
          )
          .ilike("disciplina_nome", contrato.disciplina_nome)
          .order("data_aula", { ascending: true });
        if (contrato.turma_id) q.eq("turma_id", contrato.turma_id);
        const { data: p2 } = await q;
        planos = p2 ?? [];
      }

      // Fallback 2: somente por nome da disciplina
      if ((!planos || planos.length === 0) && contrato.disciplina_nome) {
        const { data: p3 } = await admin
          .from("conteudo_programatico_aulas")
          .select(
            "id, data_aula, topico, objetivo, metodologia, recursos, observacoes, tipo_avaliacao, disciplina_nome",
          )
          .ilike("disciplina_nome", contrato.disciplina_nome)
          .order("data_aula", { ascending: true });
        planos = p3 ?? [];
      }

      console.log(
        `[accept-contract] planos encontrados=${planos?.length ?? 0} disciplina_id=${contrato.disciplina_id} disciplina_nome=${contrato.disciplina_nome}`,
      );

      // Gera signed URL do PDF para anexo
      let pdfUrl: string | null = null;
      if (contrato.pdf_storage_path) {
        const { data: signed } = await admin.storage
          .from("contratos")
          .createSignedUrl(contrato.pdf_storage_path, 60 * 60 * 24 * 7);
        pdfUrl = signed?.signedUrl ?? null;
      }

      // Gera PDF do Conteudo Programatico (Plano de Aulas) e faz upload
      let planoPdfUrl: string | null = null;
      let planoPdfNome: string | null = null;
      try {
        const planoBytes = await buildPlanoAulasPDF({
          disciplina: contrato.disciplina_nome ?? "Disciplina",
          professor: professor?.nome ?? "Professor(a)",
          turma: turmaInfo?.nome ?? "-",
          curso: turmaInfo?.curso ?? "-",
          turno: mapTurno(turmaInfo?.periodo) ?? "-",
          cargaHoraria: contrato.carga_horaria ?? null,
          periodo: contrato.periodo_aulas ?? null,
          aulas: (planos ?? []).map((p) => ({
            data: p.data_aula,
            topico: p.topico,
            objetivo: p.objetivo,
            metodologia: p.metodologia,
            recursos: p.recursos,
            observacoes: p.observacoes,
            tipo: p.tipo_avaliacao,
          })),
        });
        const safeProf = (professor?.nome ?? "Professor").replace(/\s+/g, "_");
        const safeDisc = (contrato.disciplina_nome ?? "Disciplina").replace(/\s+/g, "_");
        planoPdfNome = `Plano_Aulas_${safeDisc}_${safeProf}.pdf`;
        const planoPath = `planos-aula/${contrato.id}/${Date.now()}_${planoPdfNome}`;
        const { error: upErr2 } = await admin.storage
          .from("contratos")
          .upload(planoPath, planoBytes, {
            contentType: "application/pdf",
            upsert: true,
          });
        if (!upErr2) {
          const { data: signed2 } = await admin.storage
            .from("contratos")
            .createSignedUrl(planoPath, 60 * 60 * 24 * 7);
          planoPdfUrl = signed2?.signedUrl ?? null;
        } else {
          console.error("Falha upload plano PDF", upErr2);
        }
      } catch (e) {
        console.error("Falha geracao plano PDF", e);
      }

      await postToMake({
        acao: "contrato_aceito",
        contrato_id: contrato.id,
        email_professor: professor?.email ?? contrato.email_destino,
        nome_professor: professor?.nome ?? null,
        telefone_professor: professor?.telefone ?? null,
        disciplina: contrato.disciplina_nome,
        carga_horaria: contrato.carga_horaria,
        periodo_aulas: contrato.periodo_aulas,
        valor_numerico: contrato.valor_numerico,
        valor_extenso: contrato.valor_extenso,
        aceito_em: updates.aceito_em,
        contrato_pdf_url: pdfUrl,
        plano_aulas_pdf_url: planoPdfUrl,
        plano_aulas_pdf_nome: planoPdfNome,
        ...turmaPayload,
        disciplina_data_inicio: discInfo?.data_inicio ?? null,
        disciplina_data_termino: discInfo?.data_termino ?? null,
        integracoes: {
          email: {
            enviar: true,
            para: professor?.email ?? contrato.email_destino,
            cc: [EMAIL_CENTRAL],
            assunto: `Contrato aceito — ${contrato.disciplina_nome}`,
            corpo_html: `<p>Olá, ${professor?.nome ?? "Professor(a)"},</p>
<p>Confirmamos o aceite do seu contrato para a disciplina <strong>${contrato.disciplina_nome}</strong> — Turma <strong>${turmaInfo?.nome ?? "-"}</strong> (${turmaInfo?.curso ?? "-"} / ${mapTurno(turmaInfo?.periodo) ?? "-"}), com início em <strong>${discInfo?.data_inicio ?? turmaInfo?.data_inicio ?? "-"}</strong>.</p>
<p>Seguem em anexo: (1) o PDF do contrato aceito e (2) o Conteúdo Programático com o Plano de Aulas completo da disciplina. Caso identifique qualquer divergência, por favor responda este e-mail sinalizando a mudança.</p>
<p>Atenciosamente,<br/>Centro de Formação Técnica em Enfermagem Irmã Dulce</p>`,
            anexo_url: pdfUrl,
            anexo_nome: `Contrato_${(professor?.nome ?? "Professor").replace(/\s+/g, "_")}_${contrato.disciplina_nome.replace(/\s+/g, "_")}.pdf`,
            anexos: [
              pdfUrl
                ? {
                    nome: `Contrato_${(professor?.nome ?? "Professor").replace(/\s+/g, "_")}_${contrato.disciplina_nome.replace(/\s+/g, "_")}.pdf`,
                    url: pdfUrl,
                    tipo: "contrato",
                  }
                : null,
              planoPdfUrl
                ? {
                    nome: planoPdfNome,
                    url: planoPdfUrl,
                    tipo: "plano_aulas",
                  }
                : null,
            ].filter(Boolean),
            plano_aulas_pdf_url: planoPdfUrl,
            plano_aulas_pdf_nome: planoPdfNome,
            turma: turmaInfo?.nome ?? null,
            turno: mapTurno(turmaInfo?.periodo),
            curso: turmaInfo?.curso ?? null,
            data_inicio_turma: turmaInfo?.data_inicio ?? null,
          },
          drive: {
            salvar: true,
            pasta: DRIVE_FOLDER_NAME,
            subpasta: turmaInfo?.nome ?? null,
            arquivo_nome: `Contrato_${(professor?.nome ?? "Professor").replace(/\s+/g, "_")}_${contrato.disciplina_nome.replace(/\s+/g, "_")}.pdf`,
            arquivo_url: pdfUrl,
            turma: turmaInfo?.nome ?? null,
            turno: mapTurno(turmaInfo?.periodo),
            curso: turmaInfo?.curso ?? null,
            data_inicio_turma: turmaInfo?.data_inicio ?? null,
          },
          calendar: {
            criar_evento: true,
            calendar_id: EMAIL_CENTRAL,
            titulo: `${contrato.disciplina_nome} — ${professor?.nome ?? "Professor"} (${turmaInfo?.nome ?? ""})`,
            descricao: `Disciplina: ${contrato.disciplina_nome}
Professor: ${professor?.nome ?? "-"} (${professor?.email ?? "-"})
Turma: ${turmaInfo?.nome ?? "-"} — ${turmaInfo?.curso ?? "-"} — ${mapTurno(turmaInfo?.periodo) ?? "-"}
Carga horária: ${contrato.carga_horaria}h
Período: ${contrato.periodo_aulas}

Caso haja qualquer mudança nesta programação, por favor sinalize respondendo ao e-mail de confirmação do contrato.`,
            data_inicio: discInfo?.data_inicio ?? turmaInfo?.data_inicio ?? null,
            data_termino: discInfo?.data_termino ?? null,
            convidados: [professor?.email ?? contrato.email_destino, EMAIL_CENTRAL].filter(Boolean),
            lembretes_minutos: [
              10080, // 7 dias antes (semanal)
              10080, // 1 semana antes do início
              2880,  // 2 dias antes
            ],
            recorrencia_semanal_ate_inicio: true,
            turma: turmaInfo?.nome ?? null,
            turno: mapTurno(turmaInfo?.periodo),
            curso: turmaInfo?.curso ?? null,
            data_inicio_turma: turmaInfo?.data_inicio ?? null,
          },
          contexto_turma: {
            turma: turmaInfo?.nome ?? null,
            turno: mapTurno(turmaInfo?.periodo),
            curso: turmaInfo?.curso ?? null,
            data_inicio_turma: turmaInfo?.data_inicio ?? null,
          },
        },
        anexos: (planos ?? []).map((p) => ({
          id: p.id,
          data: p.data_aula,
          titulo: p.topico,
          disciplina: p.disciplina_nome,
          objetivo: p.objetivo,
          metodologia: p.metodologia,
          recursos: p.recursos,
          observacoes: p.observacoes,
          tipo: p.tipo_avaliacao,
        })),
        total_planos: planos?.length ?? 0,
        notificar_whatsapp: ["equipe", "adm"],
        whatsapp_destino: DEFAULT_WHATSAPP,
      });
    } else {
      // Auto-cleanup: remove professor da disciplina e cronograma
      if (contrato.disciplina_id) {
        await admin
          .from("disciplinas")
          .update({ nome_professor: null })
          .eq("id", contrato.disciplina_id);
        await admin
          .from("cronograma_mestre")
          .update({ professor_id: null })
          .eq("disciplina_id", contrato.disciplina_id)
          .eq("professor_id", contrato.professor_id);
      }

      await postToMake({
        acao: "contrato_recusado",
        contrato_id: contrato.id,
        email_professor: professor?.email ?? contrato.email_destino,
        nome_professor: professor?.nome ?? null,
        telefone_professor: professor?.telefone ?? null,
        telefone_professor_2: professor?.telefone2 ?? null,
        disciplina: contrato.disciplina_nome,
        recusado_em: updates.recusado_em,
        cronograma_limpo: true,
        ...turmaPayload,
        notificar_whatsapp: ["equipe", "adm"],
        whatsapp_destino: DEFAULT_WHATSAPP,
      });
    }

    return new Response(JSON.stringify({ ok: true, status: novoStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});