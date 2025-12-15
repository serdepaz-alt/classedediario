import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
  }[];
  students_present: {
    student_id: string;
    student_name: string;
    student_email: string | null;
  }[];
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

  try {
    const {
      disciplina_nome,
      data,
      admin_email,
      students_with_issues,
      students_present,
    }: AttendanceNotificationRequest = await req.json();

    const emailResults = [];

    // 1. Send email to admin about students with issues (2+ absences/lates)
    if (students_with_issues.length > 0 && admin_email) {
      const issuesList = students_with_issues
        .map(
          (s) =>
            `<li><strong>${s.student_name}</strong>: ${s.total_absences} falta(s), ${s.total_lates} atraso(s)</li>`
        )
        .join("");

      const result = await sendEmail(
        [admin_email],
        `[Alerta] Alunos com Faltas/Atrasos - ${disciplina_nome}`,
        `
          <h1>Alerta de Frequência - ${disciplina_nome}</h1>
          <p>Data: ${data}</p>
          <p>Os seguintes alunos têm 2 ou mais faltas/atrasos acumulados:</p>
          <ul>${issuesList}</ul>
          <p>Por favor, tome as providências necessárias.</p>
          <p>Atenciosamente,<br>Sistema Diário de Classe</p>
        `
      );
      if (result) emailResults.push({ type: "admin", result });
    }

    // 2. Send warning emails to students with issues
    for (const student of students_with_issues) {
      if (student.student_email) {
        const result = await sendEmail(
          [student.student_email],
          `[Advertência] Frequência na disciplina ${disciplina_nome}`,
          `
            <h1>Atenção, ${student.student_name}!</h1>
            <p>Você acumulou <strong>${student.total_absences} falta(s)</strong> e <strong>${student.total_lates} atraso(s)</strong> na disciplina <strong>${disciplina_nome}</strong>.</p>
            <p>Sua frequência atual está sendo monitorada. Por favor, compareça às próximas aulas para evitar reprovação por falta.</p>
            <p>Atenciosamente,<br>Sistema Diário de Classe</p>
          `
        );
        if (result) emailResults.push({ type: "warning", student: student.student_name, result });
      }
    }

    // 3. Send recognition emails to present students
    for (const student of students_present) {
      if (student.student_email) {
        const result = await sendEmail(
          [student.student_email],
          `Parabéns pela sua presença - ${disciplina_nome}`,
          `
            <h1>Parabéns, ${student.student_name}!</h1>
            <p>Seu esforço e progresso individual é notável.</p>
            <p>Continue participando ativamente das aulas de <strong>${disciplina_nome}</strong>. Sua dedicação é admirável!</p>
            <p>Atenciosamente,<br>Sistema Diário de Classe</p>
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
