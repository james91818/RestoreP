import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : null
    const commit = body?.commit === true

    const fwd = req.headers.get('x-forwarded-for') ?? ''
    const ip = (fwd.split(',')[0] || req.headers.get('cf-connecting-ip') || '').trim()

    // If we cannot determine the IP, do not block legitimate users.
    if (!ip) return json({ allowed: true, reason: 'no-ip' })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { count, error } = await supabase
      .from('signup_ip_log')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)

    if (error) return json({ allowed: true, reason: 'lookup-failed' })

    if ((count ?? 0) >= 1) {
      return json({
        allowed: false,
        reason: 'ip-limit',
        message: 'Von dieser Internetverbindung wurde bereits ein Konto registriert. Bitte kontaktieren Sie unseren Support.',
      })
    }

    if (commit) {
      await supabase.from('signup_ip_log').insert({ ip, email })
    }

    return json({ allowed: true })
  } catch (_e) {
    return json({ allowed: true, reason: 'error' })
  }
})
