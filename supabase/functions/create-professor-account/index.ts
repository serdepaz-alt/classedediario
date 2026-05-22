import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const adminUserId = userData.user.id;

    const { professorIds } = await req.json();
    if (!Array.isArray(professorIds) || professorIds.length === 0) {
      return new Response(JSON.stringify({ error: "professorIds requerido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Emails cujas senhas NÃO devem ser sobrescritas (mantidas como cadastradas pelo próprio usuário)
    const PROTECTED_EMAILS = new Set([
      "serdepaz@gmail.com",
      "luciano.ribeiro@irmadulceoficial.com.br",
    ]);

    const { data: professores, error: profErr } = await admin
      .from("cad_professores")
      .select("id, nome, email, senha, data_nascimento")
      .eq("user_id", adminUserId)
      .in("id", professorIds);

    if (profErr) throw profErr;

    const results: Array<{
      professor_id: string;
      nome: string;
      email: string | null;
      status: "created" | "linked" | "exists" | "skipped" | "error";
      message?: string;
    }> = [];

    for (const p of professores ?? []) {
      if (!p.email || !p.senha) {
        results.push({
          professor_id: p.id,
          nome: p.nome,
          email: p.email,
          status: "skipped",
          message: "Email ou senha ausente",
        });
        continue;
      }

      // Já vinculado?
      const { data: existingLink } = await admin
        .from("professor_logins")
        .select("auth_user_id")
        .eq("professor_id", p.id)
        .maybeSingle();

      if (existingLink) {
        const isProtected = PROTECTED_EMAILS.has(p.email.toLowerCase());
        if (!isProtected) {
          try {
            await admin.auth.admin.updateUserById(existingLink.auth_user_id, {
              password: p.senha,
            });
          } catch (_) { /* ignore */ }
        }
        results.push({
          professor_id: p.id,
          nome: p.nome,
          email: p.email,
          status: "exists",
          message: isProtected
            ? "Login já existente (senha preservada)"
            : "Login já existente (senha sincronizada)",
        });
        continue;
      }

      // Cria conta auth (ou recupera existente)
      let authUserId: string | null = null;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: p.email,
        password: p.senha,
        email_confirm: true,
        user_metadata: { nome: p.nome, role: "professor" },
      });

      if (createErr) {
        // Provavelmente já existe — procurar
        const { data: list } = await admin.auth.admin.listUsers();
        const found = list?.users?.find(
          (u) => u.email?.toLowerCase() === p.email!.toLowerCase()
        );
        if (found) {
          authUserId = found.id;
          if (!PROTECTED_EMAILS.has(p.email.toLowerCase())) {
            await admin.auth.admin.updateUserById(found.id, { password: p.senha });
          }
        } else {
          results.push({
            professor_id: p.id,
            nome: p.nome,
            email: p.email,
            status: "error",
            message: createErr.message,
          });
          continue;
        }
      } else {
        authUserId = created.user.id;
      }

      // Vincula
      const { error: linkErr } = await admin.from("professor_logins").insert({
        auth_user_id: authUserId!,
        professor_id: p.id,
        admin_user_id: adminUserId,
      });
      if (linkErr) {
        results.push({
          professor_id: p.id,
          nome: p.nome,
          email: p.email,
          status: "error",
          message: linkErr.message,
        });
        continue;
      }

      // Role
      await admin.from("user_roles").insert({
        user_id: authUserId!,
        role: "professor",
      });

      results.push({
        professor_id: p.id,
        nome: p.nome,
        email: p.email,
        status: "created",
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});