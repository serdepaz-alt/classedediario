import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
      .select("id, status")
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