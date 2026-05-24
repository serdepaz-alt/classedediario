import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.17'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as evolucaoTemplate } from '../_shared/transactional-email-templates/evolucao-pedagogica.tsx'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const to = body?.to ?? 'serdepaz@gmail.com'
    let data: Record<string, any> = { ...evolucaoTemplate.previewData, ...(body?.data ?? {}) }

    // Se turmaId for fornecido, busca dados reais da turma + disciplinas
    const turmaId: string | undefined = body?.turmaId
    if (turmaId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const sb = createClient(supabaseUrl, serviceKey)

      const [{ data: turma }, { data: disciplinas }] = await Promise.all([
        sb.from('turmas').select('nome, curso, periodo, horario, data_inicio').eq('id', turmaId).maybeSingle(),
        sb.from('disciplinas')
          .select('nome, nome_professor, carga_horaria_total, carga_horaria_diaria, dias_uteis, data_inicio, data_termino')
          .eq('turma_id', turmaId)
          .order('data_inicio', { ascending: true }),
      ])

      const fmt = (d?: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
      const hoje = new Date().toISOString().slice(0, 10)
      const lista = disciplinas ?? []

      const gestaoCronograma = lista.map((d: any, idx: number) => {
        const ini = d.data_inicio ?? ''
        const fim = d.data_termino ?? ''
        const status = fim && fim < hoje ? 'Concluído' : (ini && ini <= hoje && fim >= hoje ? 'Atual' : 'Futuro')
        return {
          id: idx + 1,
          disciplina: d.nome,
          professor: d.nome_professor ?? '—',
          chTotal: d.carga_horaria_total ?? '—',
          chDiaria: d.carga_horaria_diaria ?? '—',
          dias: d.dias_uteis ?? '—',
          inicio: fmt(d.data_inicio),
          termino: fmt(d.data_termino),
          status,
        }
      })

      const concluidas = gestaoCronograma.filter((d) => d.status === 'Concluído').length
      const total = gestaoCronograma.length

      data = {
        ...data,
        cabecalhoTurma: {
          turmaNome: turma?.nome ?? data.cabecalhoTurma?.turmaNome ?? '—',
          qtdDisciplinas: total,
          turno: turma?.periodo ?? data.cabecalhoTurma?.turno ?? '—',
          horario: turma?.horario ?? '—',
          dataInicioTurma: fmt(turma?.data_inicio),
        },
        cronograma: {
          turmaCode: turma?.nome ?? '—',
          totalDisciplinas: total,
          turno: turma?.periodo ?? '—',
          inicio: fmt(turma?.data_inicio),
          concluidas,
          total: total || 1,
        },
        gestaoCronograma,
        turma: turma?.nome ? `${turma.nome}${turma.curso ? ' - ' + turma.curso : ''}` : data.turma,
      }
    }

    const element = React.createElement(evolucaoTemplate.component as any, data)
    const html = await render(element)
    const subject = evolucaoTemplate.subject(data)

    const SMTP_USER = Deno.env.get('SMTP_USER')!
    // Gmail app passwords are often pasted with spaces — strip them
    const SMTP_PASS = (Deno.env.get('SMTP_PASS') ?? '').replace(/\s+/g, '')
    const SMTP_HOST = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com'
    // Use implicit TLS on 465 for Gmail — STARTTLS on 587 is unreliable in edge runtime
    const SMTP_PORT = 465

    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: true,
        auth: { username: SMTP_USER, password: SMTP_PASS },
      },
    })

    const emailPayload = {
      from: SMTP_USER,
      to,
      subject: String(subject).replace(/[\r\n]+/g, ' ').trim(),
      html,
    }

    await client.send(emailPayload)
    await client.close()

    return new Response(JSON.stringify({ success: true, to, subject }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('send-evolucao-email error', e)
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})