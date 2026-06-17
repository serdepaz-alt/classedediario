import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    if (!(roles ?? []).some((r: any) => r.role === "admin"))
      return json({ error: "Acesso negado" }, 403);

    const { nome, email, senha, whatsapp, cpf, funcao } = await req.json();
    if (!nome || !email || !senha || senha.length < 10)
      return json({ error: "Nome, e-mail e senha (min. 10) são obrigatórios" }, 400);

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (cErr || !created.user) return json({ error: cErr?.message ?? "Falha ao criar usuário" }, 400);

    const userId = created.user.id;

    const { error: rErr } = await admin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (rErr) return json({ error: rErr.message }, 400);

    const { error: iErr } = await admin.from("cad_administradores").insert({
      user_id: userId,
      nome,
      email,
      whatsapp: whatsapp || null,
      cpf: cpf || null,
      funcao: funcao || null,
      status: "Ativo",
    });
    if (iErr) return json({ error: iErr.message }, 400);

    return json({ success: true, user_id: userId });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});