import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GradeNotificationRequest {
  student_id: string;
  student_name: string;
  student_email: string | null;
  disciplina_nome: string;
  turma_nome: string;
  professor_nome: string;
  grades: {
    nome_avaliacao: string;
    valor: number | null;
    peso: number;
    is_locked: boolean;
  }[];
  media_final: number;
  bonus: number;
  situacao: string | null;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Diário de Classe <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Error sending email:", error);
    return null;
  }

  return await response.json();
}

function buildGradeEmailHtml(data: GradeNotificationRequest): string {
  const gradesRows = data.grades
    .map(
      (g) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${g.nome_avaliacao}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${g.peso}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:bold;">
          ${g.valor !== null ? g.valor.toFixed(1) : "—"}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">
          ${g.is_locked ? "✅ Oficial" : "⏳ Parcial"}
        </td>
      </tr>`
    )
    .join("");

  const situacaoColor =
    data.situacao === "Aprovado"
      ? "#16a34a"
      : data.situacao === "Recuperação"
      ? "#ca8a04"
      : data.situacao === "Reprovado"
      ? "#dc2626"
      : "#6b7280";

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family:Arial,sans-serif;background:#f9fafb;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <div style="background:#1a1a2e;color:#fff;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:22px;">📋 Boletim de Notas</h1>
          <p style="margin:8px 0 0;opacity:0.8;font-size:14px;">Diário de Classe</p>
        </div>
        
        <div style="padding:24px;">
          <p style="font-size:16px;color:#333;">Olá, <strong>${data.student_name}</strong>!</p>
          <p style="color:#555;font-size:14px;">Segue abaixo o resumo das suas notas:</p>
          
          <table style="width:100%;margin:16px 0;border-collapse:collapse;font-size:14px;">
            <tr style="background:#f1f5f9;">
              <td style="padding:8px 12px;font-weight:600;">Turma</td>
              <td style="padding:8px 12px;">${data.turma_nome}</td>
            </tr>
            <tr>
              <td style="padding:8px 12px;font-weight:600;">Disciplina</td>
              <td style="padding:8px 12px;">${data.disciplina_nome}</td>
            </tr>
            <tr style="background:#f1f5f9;">
              <td style="padding:8px 12px;font-weight:600;">Professor(a)</td>
              <td style="padding:8px 12px;">${data.professor_nome}</td>
            </tr>
          </table>

          <h3 style="color:#1a1a2e;margin-top:24px;">Avaliações</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr style="background:#1a1a2e;color:#fff;">
                <th style="padding:10px 12px;text-align:left;">Avaliação</th>
                <th style="padding:10px 12px;text-align:center;">Peso</th>
                <th style="padding:10px 12px;text-align:center;">Nota</th>
                <th style="padding:10px 12px;text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${gradesRows}
            </tbody>
          </table>

          ${data.bonus > 0 ? `<p style="font-size:14px;color:#555;margin-top:12px;">🎁 Bônus aplicado: <strong>+${data.bonus.toFixed(1)}</strong></p>` : ""}

          <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:8px;border-left:4px solid ${situacaoColor};text-align:center;">
            <p style="font-size:24px;font-weight:bold;margin:0;color:#1a1a2e;">
              Média Final: ${data.media_final.toFixed(1)}
            </p>
            ${
              data.situacao
                ? `<p style="font-size:16px;font-weight:600;margin:8px 0 0;color:${situacaoColor};">
                    ${data.situacao === "Aprovado" ? "✅" : data.situacao === "Recuperação" ? "⚠️" : "❌"} ${data.situacao}
                  </p>`
                : `<p style="font-size:13px;color:#6b7280;margin:8px 0 0;">Notas ainda em andamento</p>`
            }
          </div>
        </div>

        <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#6b7280;">
          <p style="margin:0;">Este email foi gerado automaticamente pelo sistema Diário de Classe.</p>
          <p style="margin:4px 0 0;">Em caso de dúvidas, entre em contato com a coordenação.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated caller (user JWT or service role)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (token !== SERVICE_ROLE) {
    const sbAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: authData, error: authErr } = await sbAuth.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  try {
    const payload: GradeNotificationRequest = await req.json();

    if (!payload.student_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Aluno sem email cadastrado" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const html = buildGradeEmailHtml(payload);
    const subject = `Boletim de Notas - ${payload.disciplina_nome} (${payload.turma_nome})`;

    const result = await sendEmail(payload.student_email, subject, html);

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: "Falha ao enviar email. Verifique a configuração do serviço de email." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update notification status in notas table
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    for (const grade of payload.grades) {
      if (grade.is_locked && grade.valor !== null) {
        await supabaseClient
          .from("notas")
          .update({
            notificacao_status: "Enviado",
            notificacao_enviada_em: new Date().toISOString(),
            valor_notificado: grade.valor,
          })
          .eq("student_id", payload.student_id)
          .eq("nome_avaliacao", grade.nome_avaliacao);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-grade-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
