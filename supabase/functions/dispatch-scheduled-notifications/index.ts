import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

// Maps JS getDay() (0=Sun..6=Sat) -> 3-letter PT label used in the UI
const DIA_LABEL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface TurnoCfg { ativo: boolean; dias: string[]; horario: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(supabaseUrl, serviceKey)

    // Reference time — supports manual ?date=YYYY-MM-DDTHH:mm for testing
    const url = new URL(req.url)
    const overrideDate = url.searchParams.get('date')
    // Use America/Sao_Paulo for matching weekday/time
    const nowUtc = overrideDate ? new Date(overrideDate) : new Date()
    const brStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
    }).formatToParts(nowUtc)
    const map: Record<string, string> = {}
    brStr.forEach(p => { map[p.type] = p.value })
    const todayKey = `${map.year}-${map.month}-${map.day}` // YYYY-MM-DD in BR
    const hh = map.hour
    const mm = map.minute
    const nowMinutes = parseInt(hh, 10) * 60 + parseInt(mm, 10)

    // Match the JS weekday in America/Sao_Paulo
    const brDate = new Date(`${todayKey}T${hh}:${mm}:00-03:00`)
    const dayLabel = DIA_LABEL[brDate.getUTCDay() === 0 ? 0 : new Date(brDate.toUTCString()).getDay()]
    // Safer recomputation: use locale weekday from Intl
    const weekdayShort = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'short',
    }).format(nowUtc)
    // pt-BR returns e.g. "seg.", normalize to UI labels
    const norm = weekdayShort.replace('.', '').toLowerCase()
    const dayLabelFinal = ({
      dom: 'Dom', seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex', sáb: 'Sáb', sab: 'Sáb',
    } as Record<string, string>)[norm] || dayLabel

    // Load all enabled settings
    const { data: allSettings, error: sErr } = await sb
      .from('notification_settings')
      .select('user_id, auto_enabled, selected_turmas, matutino, vespertino, noturno')
      .eq('auto_enabled', true)
    if (sErr) throw sErr

    const results: any[] = []

    for (const s of allSettings || []) {
      const turnos: { name: string; cfg: TurnoCfg }[] = [
        { name: 'Matutino', cfg: s.matutino as unknown as TurnoCfg },
        { name: 'Vespertino', cfg: s.vespertino as unknown as TurnoCfg },
        { name: 'Noturno', cfg: s.noturno as unknown as TurnoCfg },
      ]

      for (const { name, cfg } of turnos) {
        if (!cfg?.ativo) continue
        if (!cfg.dias?.includes(dayLabelFinal)) continue

        // Match within a 5-minute window (cron runs every 5 min)
        const [sh, sm] = (cfg.horario || '00:00').split(':').map(Number)
        const schedMinutes = sh * 60 + sm
        const diff = nowMinutes - schedMinutes
        if (diff < 0 || diff >= 5) continue

        // Idempotency: skip if already dispatched today for this user+turno via cron
        const { data: existing } = await sb
          .from('notification_dispatch_log')
          .select('id')
          .eq('user_id', s.user_id)
          .eq('turno', name)
          .eq('dispatch_date', todayKey)
          .eq('trigger_source', 'cron')
          .limit(1)
          .maybeSingle()
        if (existing) {
          results.push({ user_id: s.user_id, turno: name, skipped: 'already_sent_today' })
          continue
        }

        const turmaIds: string[] = Array.isArray(s.selected_turmas) ? (s.selected_turmas as any) : []
        if (turmaIds.length === 0) continue

        // Fetch active students of these turmas
        const { data: alunos } = await sb
          .from('students')
          .select('id, nome, email, turma_id')
          .in('turma_id', turmaIds)
          .eq('status', 'Ativo')
          .eq('user_id', s.user_id)

        let sent = 0
        let failed = 0
        for (const a of alunos || []) {
          if (!a.email) continue
          try {
            const r = await fetch(`${supabaseUrl}/functions/v1/send-evolucao-email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${serviceKey}`,
              },
              body: JSON.stringify({ to: a.email, turmaId: a.turma_id, data: { studentName: a.nome } }),
            })
            if (r.ok) sent++; else failed++
            await r.text()
          } catch (_) {
            failed++
          }
        }

        await sb.from('notification_dispatch_log').insert({
          user_id: s.user_id,
          turno: name,
          dispatch_date: todayKey,
          sent_count: sent,
          failed_count: failed,
          total_count: (alunos || []).length,
          trigger_source: 'cron',
        } as any)

        results.push({ user_id: s.user_id, turno: name, sent, failed, total: (alunos || []).length })
      }
    }

    return new Response(JSON.stringify({ ok: true, day: dayLabelFinal, hh, mm, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    })
  } catch (e) {
    console.error('dispatch-scheduled-notifications error', e)
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})