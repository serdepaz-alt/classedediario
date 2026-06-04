import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      const { data: planos } = await admin
        .from("conteudo_programatico_aulas")
        .select(
          "id, data_aula, topico, objetivo, metodologia, recursos, observacoes, tipo_avaliacao, disciplina_nome",
        )
        .eq("disciplina_id", contrato.disciplina_id)
        .order("data_aula", { ascending: true });

      // Gera signed URL do PDF para anexo
      let pdfUrl: string | null = null;
      if (contrato.pdf_storage_path) {
        const { data: signed } = await admin.storage
          .from("contratos")
          .createSignedUrl(contrato.pdf_storage_path, 60 * 60 * 24 * 7);
        pdfUrl = signed?.signedUrl ?? null;
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
<p>O PDF do contrato segue em anexo. Caso identifique qualquer divergência, por favor responda este e-mail sinalizando a mudança.</p>
<p>Atenciosamente,<br/>Centro de Formação Técnica em Enfermagem Irmã Dulce</p>`,
            anexo_url: pdfUrl,
            anexo_nome: `Contrato_${(professor?.nome ?? "Professor").replace(/\s+/g, "_")}_${contrato.disciplina_nome.replace(/\s+/g, "_")}.pdf`,
          },
          drive: {
            salvar: true,
            pasta: DRIVE_FOLDER_NAME,
            subpasta: turmaInfo?.nome ?? null,
            arquivo_nome: `Contrato_${(professor?.nome ?? "Professor").replace(/\s+/g, "_")}_${contrato.disciplina_nome.replace(/\s+/g, "_")}.pdf`,
            arquivo_url: pdfUrl,
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