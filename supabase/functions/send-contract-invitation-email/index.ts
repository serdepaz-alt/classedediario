import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import * as React from 'npm:react@18.3.1'
import { render } from 'npm:@react-email/render@0.0.17'
import nodemailer from 'npm:nodemailer@6.9.16'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as contractTemplate } from '../_shared/transactional-email-templates/professor-contract-invitation.tsx'

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
  const token = authHeader.replace('Bearer ', '')
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (token !== SERVICE_ROLE) {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data, error } = await sb.auth.getUser(token)
    if (error || !data?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const body = await req.json().catch(() => ({}))
    const to: string | undefined = body?.to
    if (!to) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo "to" é obrigatório' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      )
    }

    const data = { ...contractTemplate.previewData, ...(body?.data ?? {}) }

    const element = React.createElement(contractTemplate.component as any, data)
    const html = await render(element)
    const subject = typeof contractTemplate.subject === 'function'
      ? contractTemplate.subject(data)
      : contractTemplate.subject

    const SMTP_USER = Deno.env.get('SMTP_USER')!
    const SMTP_PASS = (Deno.env.get('SMTP_PASS') ?? '').replace(/\s+/g, '')
    const SMTP_HOST = Deno.env.get('SMTP_HOST') ?? 'smtp.gmail.com'
    const SMTP_PORT = Number(Deno.env.get('SMTP_PORT') ?? 465)

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: SMTP_USER,
      to,
      subject: String(subject).replace(/[\r\n]+/g, ' ').trim(),
      html,
    })

    return new Response(JSON.stringify({ success: true, to, subject }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (e) {
    console.error('send-contract-invitation-email error', e)
    return new Response(
      JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    )
  }
})