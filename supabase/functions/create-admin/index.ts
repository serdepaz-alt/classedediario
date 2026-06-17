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

    // Tenta criar; se o e-mail já existir, reaproveita o usuário existente
    // (permitido APENAS para cadastro Administrativo — esta função só é
    // acessível por quem já possui a role 'admin').
    let userId: string | null = null;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });

    if (cErr || !created?.user) {
      const msg = (cErr?.message ?? "").toLowerCase();
      const emailExists =
        msg.includes("already") || msg.includes("registered") || msg.includes("exist");
      if (!emailExists) return json({ error: cErr?.message ?? "Falha ao criar usuário" }, 400);

      // Localiza o usuário existente por e-mail
      const { data: list, error: lErr } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (lErr) return json({ error: lErr.message }, 400);
      const existing = list.users.find(
        (u) => (u.email ?? "").toLowerCase() === email.toLowerCase(),
      );
      if (!existing) return json({ error: "E-mail já registrado mas usuário não encontrado" }, 400);
      userId = existing.id;

      // Atualiza a senha do usuário existente para a senha informada
      const { error: pErr } = await admin.auth.admin.updateUserById(userId, {
        password: senha,
      });
      if (pErr) return json({ error: pErr.message }, 400);
    } else {
      userId = created.user.id;
    }

    // Garante a role admin (ignora duplicidade pela constraint UNIQUE)
    const { error: rErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
    if (rErr) return json({ error: rErr.message }, 400);

    // Evita duplicar o cadastro administrativo para o mesmo e-mail
    const { data: existingAdmin } = await admin
      .from("cad_administradores")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (existingAdmin) {
      return json({ error: "Já existe um administrador com este e-mail" }, 409);
    }

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