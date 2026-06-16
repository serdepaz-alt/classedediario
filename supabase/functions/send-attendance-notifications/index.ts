import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AttendanceNotificationRequest {
  disciplina_id: string;
  disciplina_nome: string;
  data: string;
  admin_email: string;
  students_with_issues: {
    student_id: string;
    student_name: string;
    student_email: string | null;
    total_absences: number;
    total_lates: number;
    status: string;
    frequencia_percent?: number;
  }[];
  students_present: {
    student_id: string;
    student_name: string;
    student_email: string | null;
  }[];
  ocorrencias?: string | null;
}

async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.log("RESEND_API_KEY not configured, skipping email");
    return null;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Diário de Classe <onboarding@resend.dev>",
      to,
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
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }

  try {
    const {
      disciplina_nome,
      data,
      admin_email,
      students_with_issues,
      students_present,
      ocorrencias,
    }: AttendanceNotificationRequest = await req.json();

    const emailResults = [];

    // 1. Send detailed email to admin about students with issues
    if (students_with_issues.length > 0 && admin_email) {
      const issuesList = students_with_issues
        .map(
          (s) => `
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 8px 12px; font-weight: 500;">${s.student_name}</td>
              <td style="padding: 8px 12px; text-align: center; color: #dc2626;">${s.total_absences}</td>
              <td style="padding: 8px 12px; text-align: center; color: #d97706;">${s.total_lates}</td>
              <td style="padding: 8px 12px; text-align: center; font-weight: bold; color: ${(s.frequencia_percent || 100) < 75 ? '#dc2626' : '#16a34a'};">
                ${s.frequencia_percent || 'N/A'}%
              </td>
            </tr>
          `
        )
        .join("");

      const criticalStudents = students_with_issues.filter(
        (s) => (s.frequencia_percent || 100) < 75
      );

      const result = await sendEmail(
        [admin_email],
        `[ALERTA URGENTE] ${students_with_issues.length} aluno(s) em risco - ${disciplina_nome}`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #dc2626, #ea580c); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">⚠️ Alerta de Frequência - Ação Necessária</h1>
              <p style="margin: 5px 0 0; opacity: 0.9;">Disciplina: ${disciplina_nome} | Data: ${data}</p>
            </div>
            
            <div style="padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-top: none;">
              <p style="color: #374151; margin-bottom: 15px;">
                Os seguintes alunos apresentam <strong>acúmulo significativo de faltas e/ou atrasos</strong> que podem 
                comprometer seu aproveitamento e aprovação na disciplina:
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 8px 12px; text-align: left;">Aluno</th>
                    <th style="padding: 8px 12px; text-align: center;">Faltas</th>
                    <th style="padding: 8px 12px; text-align: center;">Atrasos</th>
                    <th style="padding: 8px 12px; text-align: center;">Frequência</th>
                  </tr>
                </thead>
                <tbody>
                  ${issuesList}
                </tbody>
              </table>

              ${criticalStudents.length > 0 ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                  <p style="color: #dc2626; font-weight: bold; margin: 0 0 5px;">
                    🚨 ${criticalStudents.length} aluno(s) com frequência abaixo de 75% - RISCO DE REPROVAÇÃO
                  </p>
                  <p style="color: #7f1d1d; margin: 0; font-size: 13px;">
                    Recomendamos uma conversa imediata com ${criticalStudents.length === 1 ? 'este aluno' : 'estes alunos'} 
                    sobre como a ausência impacta diretamente no aproveitamento do curso e no futuro profissional.
                  </p>
                </div>
              ` : ''}

              <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
                <p style="color: #92400e; font-weight: bold; margin: 0 0 5px;">
                  📋 Orientações para o Setor Administrativo:
                </p>
                <ul style="color: #78350f; margin: 0; padding-left: 20px; font-size: 13px;">
                  <li>Converse individualmente com cada aluno sobre a importância da frequência</li>
                  <li>Explique como faltas excessivas impactam na formação profissional e empregabilidade</li>
                  <li>Oriente sobre as consequências acadêmicas (reprovação por falta quando abaixo de 75%)</li>
                  <li>Identifique possíveis dificuldades e ofereça suporte (transporte, saúde, etc.)</li>
                  <li>Registre a conversa para acompanhamento futuro</li>
                </ul>
              </div>

              ${ocorrencias ? `
                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px;">
                  <p style="color: #0369a1; font-weight: bold; margin: 0 0 5px;">📝 Ocorrências do Dia:</p>
                  <p style="color: #0c4a6e; margin: 0; font-size: 13px;">${ocorrencias}</p>
                </div>
              ` : ''}
            </div>
            
            <div style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0;">
                Sistema Diário de Classe — Notificação automática de frequência
              </p>
            </div>
          </div>
        `
      );
      if (result) emailResults.push({ type: "admin", result });
    }

    // 2. Send awareness emails to students with issues - emphasizing professional impact
    for (const student of students_with_issues) {
      if (student.student_email) {
        const isCritical = (student.frequencia_percent || 100) < 75;
        const firstName = student.student_name.split(" ")[0];

        const result = await sendEmail(
          [student.student_email],
          isCritical
            ? `[ATENÇÃO URGENTE] Sua frequência está em ${student.frequencia_percent}% - ${disciplina_nome}`
            : `[Aviso] Acompanhamento de frequência - ${disciplina_nome}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${isCritical ? 'linear-gradient(135deg, #dc2626, #ea580c)' : 'linear-gradient(135deg, #d97706, #f59e0b)'}; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">
                  ${isCritical ? '🚨' : '⚠️'} Atenção, ${firstName}!
                </h1>
                <p style="margin: 5px 0 0; opacity: 0.9;">Disciplina: ${disciplina_nome}</p>
              </div>
              
              <div style="padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-top: none;">
                <div style="text-align: center; margin-bottom: 20px;">
                  <div style="display: inline-block; background: ${isCritical ? '#fef2f2' : '#fffbeb'}; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 24px; font-weight: bold; color: ${isCritical ? '#dc2626' : '#d97706'}; border: 3px solid ${isCritical ? '#fecaca' : '#fde68a'};">
                    ${student.frequencia_percent || 'N/A'}%
                  </div>
                  <p style="color: #6b7280; margin: 8px 0 0; font-size: 13px;">Sua frequência atual</p>
                </div>

                <p style="color: #374151;">
                  Você acumulou <strong style="color: #dc2626;">${student.total_absences} falta(s)</strong> e 
                  <strong style="color: #d97706;">${student.total_lates} atraso(s)</strong> na disciplina 
                  <strong>${disciplina_nome}</strong>.
                </p>

                ${isCritical ? `
                  <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 15px 0;">
                    <p style="color: #dc2626; font-weight: bold; margin: 0 0 8px;">
                      ⚠️ Sua frequência está abaixo do mínimo de 75% para aprovação!
                    </p>
                    <p style="color: #7f1d1d; margin: 0; font-size: 13px;">
                      Se continuar com este ritmo de faltas, você será <strong>reprovado por falta</strong>, 
                      independente das suas notas nas avaliações.
                    </p>
                  </div>
                ` : ''}

                <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 15px 0;">
                  <p style="color: #0369a1; font-weight: bold; margin: 0 0 8px;">
                    💡 Como isso impacta o seu futuro profissional:
                  </p>
                  <ul style="color: #0c4a6e; margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8;">
                    <li><strong>Empregabilidade:</strong> A assiduidade é uma das qualidades mais valorizadas por empregadores. Profissionais que faltam frequentemente são os primeiros a serem substituídos.</li>
                    <li><strong>Formação:</strong> Cada aula perdida é conteúdo que não será recuperado. Lacunas no conhecimento comprometem sua competência técnica.</li>
                    <li><strong>Networking:</strong> Estar presente é construir relações profissionais. Colegas de turma serão seus futuros parceiros de trabalho.</li>
                    <li><strong>Disciplina:</strong> A capacidade de manter compromissos é fundamental para qualquer carreira. Comece agora a construir esse hábito.</li>
                  </ul>
                </div>

                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 15px 0;">
                  <p style="color: #166534; font-weight: bold; margin: 0 0 8px;">
                    🎯 O que você pode fazer agora:
                  </p>
                  <ul style="color: #14532d; margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8;">
                    <li>Compareça a <strong>todas</strong> as próximas aulas para recuperar sua frequência</li>
                    <li>Se tem dificuldades (transporte, saúde), procure o setor administrativo — queremos ajudar!</li>
                    <li>Organize sua rotina para priorizar seus estudos</li>
                    <li>Lembre-se: seu esforço de hoje define suas oportunidades de amanhã</li>
                  </ul>
                </div>

                <p style="color: #374151; font-style: italic; text-align: center; margin-top: 20px; padding: 10px; background: #faf5ff; border-radius: 6px;">
                  "Cada dia é uma nova chance de construir o profissional que você deseja ser. 
                  Sua presença importa — para nós e para o seu futuro." 💜
                </p>
              </div>
              
              <div style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Sistema Diário de Classe — Notificação automática de frequência
                </p>
              </div>
            </div>
          `
        );
        if (result) emailResults.push({ type: "warning", student: student.student_name, result });
      }
    }

    // 3. Send recognition emails to present students
    for (const student of students_present) {
      if (student.student_email) {
        const firstName = student.student_name.split(" ")[0];
        const result = await sendEmail(
          [student.student_email],
          `🌟 Parabéns pela sua presença - ${disciplina_nome}`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #16a34a, #059669); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 20px;">🌟 Parabéns, ${firstName}!</h1>
                <p style="margin: 5px 0 0; opacity: 0.9;">Disciplina: ${disciplina_nome}</p>
              </div>
              
              <div style="padding: 20px; background: #fff; border: 1px solid #e5e7eb; border-top: none;">
                <p style="color: #374151; font-size: 15px;">
                  Seu esforço e progresso individual é notável. Continue participando ativamente das aulas de 
                  <strong>${disciplina_nome}</strong>.
                </p>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 15px 0; text-align: center;">
                  <p style="color: #166534; font-weight: bold; margin: 0 0 5px; font-size: 16px;">
                    ✨ Sua dedicação é admirável!
                  </p>
                  <p style="color: #14532d; margin: 0; font-size: 13px;">
                    Cada aula que você participa é um investimento direto no seu futuro profissional. 
                    Empregadores valorizam profissionais comprometidos e presentes.
                  </p>
                </div>

                <p style="color: #374151; font-style: italic; text-align: center; padding: 10px; background: #faf5ff; border-radius: 6px;">
                  "O sucesso é a soma de pequenos esforços repetidos dia após dia." 🚀
                </p>
              </div>
              
              <div style="padding: 15px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; text-align: center;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Sistema Diário de Classe — Notificação automática de frequência
                </p>
              </div>
            </div>
          `
        );
        if (result) emailResults.push({ type: "recognition", student: student.student_name, result });
      }
    }

    console.log("Email notifications processed:", emailResults.length);

    return new Response(
      JSON.stringify({ success: true, emailsSent: emailResults.length }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-attendance-notifications:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
