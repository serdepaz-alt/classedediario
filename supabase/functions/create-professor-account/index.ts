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

    const body = await req.json().catch(() => ({}));
    const professorIds = body?.professorIds;
    const all = body?.all === true;
    if (!all && (!Array.isArray(professorIds) || professorIds.length === 0)) {
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

    let query = admin
      .from("cad_professores")
      .select("id, nome, email, data_nascimento, user_id, status");
    if (!all) query = query.in("id", professorIds);
    const { data: professoresRaw, error: profErr } = await query;

    if (profErr) throw profErr;
    const professores = (professoresRaw ?? []).filter(
      (p: any) => (p.status ?? "Ativo").toLowerCase() === "ativo",
    );

    const gerarSenha = (nome: string, dn: string | null): string => {
      const primeiro = (nome || "").trim().split(/\s+/)[0].toLowerCase();
      const ano = dn ? new Date(dn + "T12:00:00").getFullYear() : "";
      let senha = `${primeiro}${ano}`;
      if (!ano) senha = `${primeiro}2026`;
      while (senha.length < 8) senha += "0";
      return senha;
    };

    const results: Array<{
      professor_id: string;
      nome: string;
      email: string | null;
      status: "created" | "linked" | "exists" | "skipped" | "error";
      message?: string;
      senha_gerada?: string;
    }> = [];

    const emailsUsados = new Map<string, string>();
    for (const p of professores ?? []) {
      if (!p.email) {
        results.push({
          professor_id: p.id,
          nome: p.nome,
          email: p.email,
          status: "skipped",
          message: "Email ausente",
        });
        continue;
      }
      const emailKey = p.email.toLowerCase().trim();
      const donoAnterior = emailsUsados.get(emailKey);
      if (donoAnterior && donoAnterior !== p.id) {
        results.push({
          professor_id: p.id,
          nome: p.nome,
          email: p.email,
          status: "skipped",
          message: "Email duplicado — já usado por outro professor",
        });
        continue;
      }
      emailsUsados.set(emailKey, p.id);

      const senhaGerada = gerarSenha(p.nome, p.data_nascimento);
      if (senhaGerada.length < 6) {
        results.push({
          professor_id: p.id,
          nome: p.nome,
          email: p.email,
          status: "skipped",
          message: "Não foi possível gerar senha padrão (nome/data de nascimento ausentes)",
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
        await admin.from("user_roles").upsert(
          { user_id: existingLink.auth_user_id, role: "professor" },
          { onConflict: "user_id,role", ignoreDuplicates: true },
        );
        const isProtected = PROTECTED_EMAILS.has(p.email.toLowerCase());
        if (!isProtected) {
          try {
            await admin.auth.admin.updateUserById(existingLink.auth_user_id, {
              password: senhaGerada,
            });
          } catch (_) { /* ignore */ }
        }
        results.push({
          professor_id: p.id,
          nome: p.nome,
          email: p.email,
          status: "exists",
          senha_gerada: isProtected ? undefined : senhaGerada,
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
        password: senhaGerada,
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
            await admin.auth.admin.updateUserById(found.id, { password: senhaGerada });
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
      const { error: linkErr } = await admin.from("professor_logins").upsert(
        {
          auth_user_id: authUserId!,
          professor_id: p.id,
          admin_user_id: p.user_id ?? adminUserId,
        },
        { onConflict: "auth_user_id" },
      );
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
      await admin.from("user_roles").upsert(
        { user_id: authUserId!, role: "professor" },
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );

      results.push({
        professor_id: p.id,
        nome: p.nome,
        email: p.email,
        status: "created",
        senha_gerada: senhaGerada,
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