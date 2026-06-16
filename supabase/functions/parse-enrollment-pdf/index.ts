import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedStudent {
  matricula: string;
  nome: string;
  data_nascimento: string | null;
  local_nascimento: string | null;
  estado_nascimento: string | null;
  nome_pai: string | null;
  nome_mae: string | null;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  titulo_eleitoral: string | null;
  endereco: string | null;
  data_matricula: string | null;
}

interface ParsedTurma {
  nome: string;
  turno: string | null;
  curso: string | null;
  data_inicio: string | null;
}

interface ParseResult {
  turma: ParsedTurma;
  students: ParsedStudent[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Require authenticated caller (user JWT or service role)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if (token !== SERVICE_ROLE) {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const { pdfContent } = await req.json();

    if (!pdfContent) {
      throw new Error("PDF content is required");
    }

    console.log("Processing PDF content for enrollment parsing...");
    console.log("Content length:", pdfContent.length);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Use AI to parse the PDF content
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um parser especializado em extrair dados de Livros de Matrícula de escolas técnicas brasileiras.
            
Extraia os seguintes dados da turma (do cabeçalho):
- nome: nome/código da turma (ex: M06)
- turno: turno das aulas (ex: Matutino)
- curso: nome do curso (ex: Técnico em Enfermagem)
- data_inicio: data de início no formato YYYY-MM-DD

Para cada aluno encontrado, extraia:
- matricula: número de matrícula
- nome: nome completo do aluno
- data_nascimento: data de nascimento no formato YYYY-MM-DD (converter de DD/MM/YYYY)
- local_nascimento: cidade de nascimento
- estado_nascimento: estado de nascimento (sigla ou nome)
- nome_pai: nome do pai
- nome_mae: nome da mãe
- telefone: telefone de contato
- email: email do aluno
- cpf: CPF (manter formato com pontos e traços)
- rg: identidade/RG
- titulo_eleitoral: título de eleitor
- endereco: endereço completo
- data_matricula: data de matrícula no formato YYYY-MM-DD

IMPORTANTE:
- Converta todas as datas do formato DD/MM/YYYY para YYYY-MM-DD
- Mantenha acentos e caracteres especiais
- Se um campo estiver vazio ou "»»" sem valor, retorne null
- Limpe caracteres de escape como \\@

Responda APENAS com um objeto JSON válido no formato:
{
  "turma": { "nome": "...", "turno": "...", "curso": "...", "data_inicio": "..." },
  "students": [{ ... }]
}`
          },
          {
            role: "user",
            content: `Extraia todos os dados do seguinte Livro de Matrícula:\n\n${pdfContent}`
          }
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from AI");
    }

    console.log("AI response received, parsing JSON...");

    // Extract JSON from the response (may be wrapped in markdown code blocks)
    let jsonString = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonString = jsonMatch[1];
    }

    const parsedData: ParseResult = JSON.parse(jsonString.trim());

    console.log(`Successfully parsed turma: ${parsedData.turma.nome}`);
    console.log(`Found ${parsedData.students.length} students`);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error("Error parsing enrollment PDF:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
