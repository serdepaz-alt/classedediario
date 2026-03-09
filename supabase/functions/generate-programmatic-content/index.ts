import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfText, disciplinaNome, dataInicio, dataTermino, cargaHorariaDiaria } = await req.json();

    if (!pdfText || !disciplinaNome) {
      return new Response(
        JSON.stringify({ error: "pdfText e disciplinaNome são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const systemPrompt = `Você é um especialista em planejamento pedagógico e educação moderna. 
Sua tarefa é analisar o conteúdo programático extraído de um PDF e gerar um plano de aulas dia a dia.

Para cada aula, você DEVE gerar:
1. **data**: A data da aula (formato YYYY-MM-DD), respeitando o período letivo informado, excluindo fins de semana
2. **topico**: O tópico/conteúdo daquele dia
3. **objetivo**: Um objetivo claro e mensurável para aquela aula (usando verbos da Taxonomia de Bloom)
4. **metodologia**: Uma metodologia moderna e adequada ao conteúdo, escolhendo entre:
   - Metodologias Ativas (Sala de Aula Invertida, Aprendizagem Baseada em Problemas, Estudo de Caso, Peer Instruction)
   - Educação 4.0 (Gamificação, Realidade Aumentada, Simulações Digitais, Learning Analytics)
   - Ferramentas Interativas (Kahoot, Mentimeter, Padlet, Google Forms interativo, Quizizz)
   - Metodologias Tradicionais Aprimoradas (Aula expositiva dialogada, Seminário, Debate estruturado)
5. **recursos**: Os recursos didáticos mais adequados para aquela aula (projetor, laboratório, material impresso, dispositivos móveis, etc.)
6. **tipo_avaliacao**: Se aquele dia é uma aula normal ("aula"), uma "revisao" ou uma "avaliacao"
7. **observacoes**: Dicas pedagógicas para o professor

REGRAS:
- Distribua o conteúdo de forma equilibrada ao longo dos dias disponíveis
- Reserve pelo menos 1 dia para revisão antes de cada avaliação
- Programe avaliações a cada 8-12 aulas
- Varie as metodologias para manter o engajamento
- Considere a carga horária diária informada
- Retorne APENAS o JSON, sem texto adicional

Formato de saída (JSON array):
[
  {
    "data": "2025-03-10",
    "topico": "...",
    "objetivo": "...",
    "metodologia": "...",
    "recursos": "...",
    "tipo_avaliacao": "aula",
    "observacoes": "..."
  }
]`;

    const userPrompt = `Disciplina: ${disciplinaNome}
Período: ${dataInicio || "a definir"} até ${dataTermino || "a definir"}
Carga horária diária: ${cargaHorariaDiaria || 60} minutos

Conteúdo extraído do PDF:
${pdfText.substring(0, 12000)}`;

    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 8000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found");
      }
    } catch (parseErr) {
      console.error("Parse error:", parseErr, "Content:", content);
      return new Response(
        JSON.stringify({ error: "Não foi possível processar a resposta da IA", raw: content }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ aulas: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
