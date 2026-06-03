import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAKE_WEBHOOK_URL =
  Deno.env.get("MAKE_WEBHOOK_URL") ??
  "https://hook.us2.make.com/rqunmuefa25z96mbnf2ifulhsfsryfwp";

const DEFAULT_WHATSAPP = "5571991747744";

function mapTurno(p: string | null | undefined): string | null {
  switch (p) {
    case "Manhã": return "Matutino";
    case "Tarde": return "Vespertino";
    case "Noite": return "Noturno";
    case "Sábado": return "Intermediário";
    default: return null;
  }
}

// Roda via pg_cron. Marca contratos > 48h sem aceite e dispara webhook uma vez.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data: contratos, error } = await admin
      .from("contratos_professores")
      .select("*")
      .eq("status", "enviado")
      .lt("enviado_em", cutoff);
    if (error) throw error;

    let disparados = 0;
    for (const c of contratos ?? []) {
      // idempotência simples: se já foi alertado, observacoes começa com "SLA_ALERTADO"
      if ((c.observacoes ?? "").includes("SLA_ALERTADO")) continue;

      const { data: prof } = await admin
        .from("cad_professores")
        .select("nome, email, telefone, telefone2")
        .eq("id", c.professor_id)
        .maybeSingle();

      let turmaInfo: any = null;
      if (c.turma_id) {
        const { data: t } = await admin
          .from("turmas")
          .select("id, nome, periodo, curso, data_inicio")
          .eq("id", c.turma_id)
          .maybeSingle();
        turmaInfo = t ?? null;
      }

      const horas = Math.floor(
        (Date.now() - new Date(c.enviado_em).getTime()) / 3_600_000,
      );

      await fetch(MAKE_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          acao: "alerta_atraso_assinatura",
          contrato_id: c.id,
          nome_professor: prof?.nome ?? null,
          email_professor: prof?.email ?? c.email_destino,
          telefone_professor: prof?.telefone ?? null,
          telefone_professor_2: prof?.telefone2 ?? null,
          disciplina: c.disciplina_nome,
          enviado_em: c.enviado_em,
          horas_sem_assinar: horas,
          turma_id: c.turma_id ?? null,
          turma_nome: turmaInfo?.nome ?? null,
          turno: mapTurno(turmaInfo?.periodo),
          curso: turmaInfo?.curso ?? null,
          turma_data_inicio: turmaInfo?.data_inicio ?? null,
          notificar_whatsapp: ["equipe", "adm"],
          whatsapp_destino: DEFAULT_WHATSAPP,
        }),
      }).catch((e) => console.error("Make webhook failed", e));

      await admin
        .from("contratos_professores")
        .update({
          observacoes: `SLA_ALERTADO em ${new Date().toISOString()}${
            c.observacoes ? " | " + c.observacoes : ""
          }`,
        })
        .eq("id", c.id);

      disparados++;
    }

    return new Response(
      JSON.stringify({ ok: true, total: contratos?.length ?? 0, disparados }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});