import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.17'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'
import { template as evolucaoTemplate } from '../_shared/transactional-email-templates/evolucao-pedagogica.tsx'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const to = body?.to ?? 'serdepaz@gmail.com'
    const data = { ...evolucaoTemplate.previewData, ...(body?.data ?? {}) }

    const element = React.createElement(evolucaoTemplate.component as any, data)
    const html = await render(element)
    const text = await render(element, { plainText: true })
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

    await client.send({
      from: `Diário de Classe <${SMTP_USER}>`,
      to,
      subject,
      content: text,
      html,
    })
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