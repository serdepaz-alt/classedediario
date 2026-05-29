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

    const systemPrompt = `Atuas como um assistente educacional. Vais receber o texto de um plano de ensino.
A tua tarefa é extrair o plano de aulas dia a dia e retornar ESTRITAMENTE um array JSON.

Procura o padrão "Dia [Número]: [Título] ([Horas]h)" seguido dos tópicos/bullet points associados a esse dia.
Ignora objetivos gerais, módulos genéricos, ementas e metodologias finais.

Para cada dia encontrado, devolve um objeto com EXATAMENTE estas chaves:
- "data": string no formato YYYY-MM-DD, calculada sequencialmente a partir da data de início informada, pulando sábados e domingos (1 dia por aula).
- "topico": string no formato exato "Aula N Dia N: <título> (<H>h)" — reaproveita o título e a carga horária extraídos do padrão "Dia N:". Se a carga horária não estiver no PDF, usa a carga horária diária informada (em horas).
- "objetivo": string curta com o objetivo da aula (deduz a partir dos tópicos daquele dia; usa verbo da Taxonomia de Bloom).
- "metodologia": string curta com uma metodologia adequada (ativa, expositiva dialogada, estudo de caso, etc.).
- "recursos": string com recursos didáticos sugeridos.
- "tipo_avaliacao": "aula" | "revisao" | "avaliacao".
- "observacoes": string opcional com dica pedagógica curta.

REGRAS:
- Numeração sequencial começando em 1; "Aula N" e "Dia N" devem coincidir.
- Retorna APENAS o JSON válido (um array), sem Markdown, sem comentários, sem texto antes ou depois.`;

    const cleanPdfText = String(pdfText)
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const userPrompt = `Disciplina: ${disciplinaNome}
Data de início: ${dataInicio || new Date().toISOString().slice(0, 10)}
Data de término: ${dataTermino || "a definir"}
Carga horária diária: ${cargaHorariaDiaria || 60} minutos

Texto extraído do PDF do plano de ensino:
"""
${cleanPdfText.substring(0, 14000)}
"""`;

    let response: Response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 55000);
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchErr) {
      console.error("AI fetch error:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Falha na interpretação da IA (timeout ou rede)" }),
        { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Falha na interpretação da IA", detail: errorText.slice(0, 500) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Extrai JSON de forma robusta (remove cercas Markdown se houver)
    let parsed;
    try {
      const cleaned = content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("No JSON array found");
      parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) throw new Error("Resposta não é um array");
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
