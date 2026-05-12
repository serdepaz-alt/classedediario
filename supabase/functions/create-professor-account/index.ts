import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { professor_id } = await req.json();
    if (!professor_id) {
      return new Response(JSON.stringify({ error: "professor_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: prof, error: profErr } = await admin
      .from("cad_professores")
      .select("id, nome, email, senha, user_id, data_nascimento")
      .eq("id", professor_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (profErr || !prof) {
      return new Response(JSON.stringify({ error: "Professor não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!prof.email) {
      return new Response(JSON.stringify({ error: "Professor sem email cadastrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const primeiroNome = prof.nome.trim().split(" ")[0];
    const ano = prof.data_nascimento ? new Date(prof.data_nascimento + "T12:00:00").getFullYear() : "";
    const senha = prof.senha && prof.senha.length >= 6 ? prof.senha : `${primeiroNome}${ano}@2026`;

    // Tenta criar; se já existir, busca pelo email
    let authUserId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: prof.email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome: prof.nome, role: "professor" },
    });

    if (createErr) {
      // procura existente
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => u.email?.toLowerCase() === prof.email!.toLowerCase());
      if (existing) {
        authUserId = existing.id;
        // atualiza senha pra refletir cadastro
        await admin.auth.admin.updateUserById(existing.id, { password: senha });
      } else {
        return new Response(JSON.stringify({ error: createErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      authUserId = created.user!.id;
    }

    // user_roles
    await admin.from("user_roles").upsert(
      { user_id: authUserId, role: "professor" },
      { onConflict: "user_id,role" },
    );

    // professor_logins
    await admin.from("professor_logins").upsert({
      auth_user_id: authUserId,
      professor_id: prof.id,
      admin_user_id: user.id,
    });

    // Garante que admin tenha role admin
    await admin.from("user_roles").upsert(
      { user_id: user.id, role: "admin" },
      { onConflict: "user_id,role" },
    );

    // Atualiza senha no cadastro
    await admin.from("cad_professores").update({ senha }).eq("id", prof.id);

    return new Response(JSON.stringify({ ok: true, email: prof.email, senha }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});