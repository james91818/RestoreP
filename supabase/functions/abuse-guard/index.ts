import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const getIp = (req: Request) => {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  return (fwd.split(',')[0] || req.headers.get('cf-connecting-ip') || '').trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const action = body?.action === 'report' ? 'report' : 'check'
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 200) : 'abuse'
    const details = typeof body?.details === 'string' ? body.details.slice(0, 500) : null

    const ip = getIp(req)
    if (!ip) return json({ blocked: false, reason: 'no-ip' })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    if (action === 'report') {
      await supabase.from('blocked_ips').upsert(
        {
          ip,
          reason,
          details: details ? { info: details, user_agent: req.headers.get('user-agent') } : { user_agent: req.headers.get('user-agent') },
        },
        { onConflict: 'ip' },
      )
      return json({ blocked: true })
    }

    const { data, error } = await supabase
      .from('blocked_ips')
      .select('ip')
      .eq('ip', ip)
      .maybeSingle()

    if (error) return json({ blocked: false, reason: 'lookup-failed' })
    return json({ blocked: !!data })
  } catch (_e) {
    return json({ blocked: false, reason: 'error' })
  }
})
