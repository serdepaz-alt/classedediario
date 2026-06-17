import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.17'
import nodemailer from 'npm:nodemailer@6.9.16'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as evolucaoTemplate } from '../_shared/transactional-email-templates/evolucao-pedagogica.tsx'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require authenticated caller (user JWT or service role)
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const authToken = authHeader.replace('Bearer ', '')
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (authToken !== SERVICE_ROLE_KEY) {
    const sbAuth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: u, error: uErr } = await sbAuth.auth.getUser(authToken)
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const body = await req.json().catch(() => ({}))
    const to = body?.to ?? 'serdepaz@gmail.com'
    let data: Record<string, any> = { ...evolucaoTemplate.previewData, ...(body?.data ?? {}) }

    // Resolve dados reais por studentId (preferencial) ou turmaId
    const studentId: string | undefined = body?.studentId
    let turmaId: string | undefined = body?.turmaId
    const needsDb = !!(studentId || turmaId)

    if (needsDb) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const sb = createClient(supabaseUrl, serviceKey)

      // 1) Carrega aluno (se studentId) e infere turma
      let student: any = null
      if (studentId) {
        const { data: s } = await sb
          .from('students')
          .select('id, nome, matricula, turma_id, status')
          .eq('id', studentId)
          .maybeSingle()
        student = s
        if (s?.turma_id) turmaId = s.turma_id
      }

      const [{ data: turma }, { data: disciplinas }] = await Promise.all([
        turmaId
          ? sb.from('turmas').select('nome, curso, periodo, horario, data_inicio').eq('id', turmaId).maybeSingle()
          : Promise.resolve({ data: null } as any),
        turmaId
          ? sb.from('disciplinas')
          .select('nome, nome_professor, carga_horaria_total, carga_horaria_diaria, dias_uteis, data_inicio, data_termino')
          .eq('turma_id', turmaId)
          .order('data_inicio', { ascending: true })
          : Promise.resolve({ data: [] } as any),
      ])

      const fmt = (d?: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—'
      const hoje = new Date().toISOString().slice(0, 10)
      const lista = disciplinas ?? []

      const gestaoCronogramaCompleto = lista.map((d: any, idx: number) => {
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
          _raw: d,
        }
      })

      // Filtra: apenas disciplina anterior (última concluída), atual e a primeira futura
      const atualIdx = gestaoCronogramaCompleto.findIndex((d) => d.status === 'Atual')
      const concluidasArr = gestaoCronogramaCompleto.filter((d) => d.status === 'Concluído')
      const futurasArr = gestaoCronogramaCompleto.filter((d) => d.status === 'Futuro')
      const anterior = concluidasArr.length > 0 ? concluidasArr[concluidasArr.length - 1] : null
      const atual = atualIdx >= 0 ? gestaoCronogramaCompleto[atualIdx] : null
      const proximaFutura = futurasArr.length > 0 ? futurasArr[0] : null
      const gestaoCronograma = [anterior, atual, proximaFutura].filter(Boolean).map(({ _raw, ...rest }: any) => rest)

      const concluidas = concluidasArr.length
      const total = gestaoCronogramaCompleto.length

      // 2) Identifica a disciplina ATUAL e carrega notas + presenças do aluno
      let avaliacoes: any[] = []
      let frequencia: any = {
        percent: 0,
        trend: 'Sem registros',
        presencas: 0,
        atestado: 0,
        faltas: 0,
        totalAulas: 0,
        sparkline: [],
      }

      const disciplinaAtualRaw = (lista as any[]).find((d: any) => {
        const ini = d.data_inicio ?? ''
        const fim = d.data_termino ?? ''
        return ini && ini <= hoje && fim >= hoje
      })
      const disciplinaAtualNome = disciplinaAtualRaw?.nome ?? null
      // re-fetch ids para notas/presencas
      let disciplinaAtualId: string | null = null
      if (turmaId && disciplinaAtualNome) {
        const { data: dRow } = await sb
          .from('disciplinas')
          .select('id')
          .eq('turma_id', turmaId)
          .eq('nome', disciplinaAtualNome)
          .maybeSingle()
        disciplinaAtualId = dRow?.id ?? null
      }

      if (student?.id && disciplinaAtualId) {
        // Notas
        const { data: notas } = await sb
          .from('notas')
          .select('nome_avaliacao, numero_avaliacao, valor, is_locked')
          .eq('student_id', student.id)
          .eq('disciplina_id', disciplinaAtualId)
          .order('numero_avaliacao', { ascending: true })

        const notasValidas = (notas ?? []).filter((n: any) => n.valor !== null && n.valor !== undefined)
        if (notasValidas.length > 0) {
          avaliacoes = notasValidas.map((n: any) => {
            const v = Number(n.valor) || 0
            const pct = Math.round(v * 10)
            return {
              label: n.nome_avaliacao || `Avaliação ${n.numero_avaliacao ?? ''}`.trim(),
              value: v.toFixed(1),
              percent: pct,
              color: pct >= 70 ? 'green' : pct >= 50 ? 'blue' : 'yellow',
            }
          })
          const { data: media } = await sb
            .from('medias_alunos')
            .select('media_parcial, media_final')
            .eq('student_id', student.id)
            .eq('disciplina_id', disciplinaAtualId)
            .maybeSingle()
          const m = media?.media_final ?? media?.media_parcial
          if (m !== null && m !== undefined) {
            const mv = Number(m) || 0
            avaliacoes.push({
              label: 'Média Atual',
              value: mv.toFixed(1),
              percent: Math.round(mv * 10),
              color: 'green',
            })
          }
        }

        // Presenças da disciplina atual
        const { data: presencas } = await sb
          .from('presencas')
          .select('data, status')
          .eq('student_id', student.id)
          .eq('disciplina_id', disciplinaAtualId)
          .order('data', { ascending: true })

        const lista = presencas ?? []
        const totalAulas = lista.length
        const norm = (s: string) => (s || '').toLowerCase()
        const isPres = (s: string) => ['presente', 'p'].includes(norm(s))
        const isFalta = (s: string) => ['falta', 'ausente', 'f'].includes(norm(s))
        const isAtest = (s: string) => norm(s).startsWith('atest') || norm(s).startsWith('just')

        const pres = lista.filter((r: any) => isPres(r.status)).length
        const fal = lista.filter((r: any) => isFalta(r.status)).length
        const ate = lista.filter((r: any) => isAtest(r.status)).length
        const pct = totalAulas > 0 ? Math.round(((pres + ate) / totalAulas) * 100) : 0

        // Última semana
        const seteDiasAtras = new Date()
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
        const cut = seteDiasAtras.toISOString().slice(0, 10)
        const semana = lista.filter((r: any) => r.data >= cut)
        const semPres = semana.filter((r: any) => isPres(r.status)).length
        const semFal = semana.filter((r: any) => isFalta(r.status)).length
        const semAte = semana.filter((r: any) => isAtest(r.status)).length

        const trendLabel = pct >= 90 ? 'Tendência Estável' : pct >= 75 ? 'Em Crescimento' : 'Alerta'

        frequencia = {
          percent: pct,
          trend: `${trendLabel} • Disciplina: ${disciplinaAtualNome}`,
          presencas: semPres,
          atestado: semAte,
          faltas: semFal,
          totalAulas: semana.length,
          sparkline: lista.slice(-12).map((r: any) =>
            isPres(r.status) ? 'green' : isFalta(r.status) ? 'red' : 'empty',
          ),
        }
      }

      data = {
        ...data,
        ...(student ? {
          studentName: student.nome,
          matricula: student.matricula,
          statusBadge: (student.status || 'REGULAR').toUpperCase(),
        } : {}),
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
        avaliacoes,
        frequencia,
        conteudoAulas: await (async () => {
          if (!disciplinaAtualId) return []
          const { data: aulas } = await sb
            .from('conteudo_programatico_aulas')
            .select('data_aula, topico, objetivo, status')
            .eq('disciplina_id', disciplinaAtualId)
            .order('data_aula', { ascending: true })
          const dias = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
          return (aulas ?? []).map((a: any) => {
            const d = a.data_aula ? new Date(a.data_aula + 'T00:00:00') : null
            return {
              data: d ? d.toLocaleDateString('pt-BR') : '—',
              diaSemana: d ? dias[d.getDay()] : '—',
              assunto: a.topico || a.objetivo || '—',
              status: a.status,
            }
          })
        })(),
        alerta: {
          texto: 'Os dados de alertas e encaminhamentos oficiais estão sendo anexados internamente pelo sistema e, em breve, divulgaremos novas atualizações.',
        },
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
    const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? 465)

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    const emailPayload = {
      from: SMTP_USER,
      to,
      subject: String(subject).replace(/[\r\n]+/g, ' ').trim(),
      html,
    }

    await transporter.sendMail(emailPayload)

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