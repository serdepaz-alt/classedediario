import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const url = new URL(req.url);
    let token = url.searchParams.get("token");
    if (!token && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      token = body?.token ?? null;
    }
    if (!token) {
      return new Response(JSON.stringify({ error: "Token obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: contrato, error } = await admin
      .from("contratos_professores")
      .select("*, cad_professores!inner(nome)")
      .eq("token_aceite", token)
      .maybeSingle();

    if (error || !contrato) {
      return new Response(JSON.stringify({ error: "Contrato não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed } = await admin.storage
      .from("contratos")
      .createSignedUrl(contrato.pdf_storage_path, 60 * 60);

    return new Response(
      JSON.stringify({
        contrato: {
          id: contrato.id,
          professor_nome: (contrato as any).cad_professores?.nome,
          disciplina_nome: contrato.disciplina_nome,
          carga_horaria: contrato.carga_horaria,
          periodo_aulas: contrato.periodo_aulas,
          valor_numerico: contrato.valor_numerico,
          valor_extenso: contrato.valor_extenso,
          status: contrato.status,
          aceito_em: contrato.aceito_em,
          enviado_em: contrato.enviado_em,
        },
        pdf_url: signed?.signedUrl ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});