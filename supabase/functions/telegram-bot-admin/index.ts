import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TG_API = (token: string) => `https://api.telegram.org/bot${token}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth: Admin only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getUser(token);
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await supabase.rpc('has_role_by_name', {
      _user_id: claimsData.user.id, _role_name: 'Admin',
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden — Admin only' }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'info') {
      // Get bot info
      const r = await fetch(`${TG_API(TELEGRAM_BOT_TOKEN)}/getMe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await r.json();
      return new Response(JSON.stringify({ ok: r.ok, result: data.result, raw: data }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === 'send_test') {
      const chatId = String(body.chat_id || '').trim();
      const text = String(body.text || '🧪 Test message from Crypto-Börse backoffice — bot is working!').slice(0, 1000);
      if (!chatId) {
        return new Response(JSON.stringify({ error: 'chat_id required' }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const r = await fetch(`${TG_API(TELEGRAM_BOT_TOKEN)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });
      const data = await r.json();

      await supabase.from('telegram_message_log').insert({
        notification_type: 'test',
        chat_id: chatId,
        message_preview: text.slice(0, 200),
        telegram_message_id: r.ok ? data.result?.message_id : null,
        status: r.ok ? 'sent' : 'failed',
        error_message: r.ok ? null : JSON.stringify(data).slice(0, 500),
        metadata: { triggered_by: claimsData.user.id },
      });

      return new Response(JSON.stringify({ ok: r.ok, result: data.result, raw: data }), {
        status: r.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
