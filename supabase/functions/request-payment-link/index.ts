import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FALLBACK_CHAT_ID = '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  if (!LOVABLE_API_KEY || !TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Telegram credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for DB ops
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read telegram_bot config
    let PAYMENT_LINK_CHAT_ID = FALLBACK_CHAT_ID;
    let enabled = true;
    try {
      const { data: cfg } = await supabase
        .from('platform_settings').select('value').eq('key', 'telegram_bot').maybeSingle();
      const plCfg = (cfg?.value as any)?.payment_links ?? {};
      if (plCfg.chat_id) PAYMENT_LINK_CHAT_ID = String(plCfg.chat_id);
      if (plCfg.enabled === false) enabled = false;
    } catch (e) { console.error('settings read failed', e); }

    if (!enabled) {
      return new Response(JSON.stringify({ error: 'Payment link Telegram notifications are disabled in settings' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!PAYMENT_LINK_CHAT_ID.trim()) {
      return new Response(JSON.stringify({ error: 'payment_links Telegram chat is not configured. Set it in Telegram Bot Manager.' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate caller identity
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsErr } = await supabase.auth.getUser(token);
    if (claimsErr || !claimsData?.user) {
      console.error("Auth validation failed:", claimsErr?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const agentId = claimsData.user.id;

    const body = await req.json();
    const { user_id, full_name, amount, currency, country, method } = body;
    const methodLabel = method === 'paypal' ? 'PayPal Request' : method === 'credit_card' ? 'Credit Card Request' : null;

    if (!user_id || !full_name || !amount || !currency) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a realistic fake email from the client's name
    const providers = ['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'hotmail.com', 'web.de', 'gmx.de', 'gmx.at'];
    const nameParts = full_name.trim().toLowerCase().replace(/[^a-zäöüß\s-]/g, '').split(/\s+/).filter(Boolean);
    const randomNum = Math.floor(Math.random() * 99) + 1;
    const provider = providers[Math.floor(Math.random() * providers.length)];
    let localPart: string;
    if (nameParts.length >= 2) {
      const patterns = [
        `${nameParts[0]}.${nameParts[nameParts.length - 1]}`,
        `${nameParts[0]}.${nameParts[nameParts.length - 1]}${randomNum}`,
        `${nameParts[0][0]}${nameParts[nameParts.length - 1]}`,
        `${nameParts[0]}${nameParts[nameParts.length - 1][0]}${randomNum}`,
      ];
      localPart = patterns[Math.floor(Math.random() * patterns.length)];
    } else {
      localPart = `${nameParts[0] || 'user'}${randomNum}`;
    }
    // Replace umlauts
    localPart = localPart.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
    const fakeEmail = `${localPart}@${provider}`;

    // Send Telegram message
    const message = `💳 <b>Link Request:</b>\n\n1. Full Name: <b>${full_name}</b>\n\n2. Amount: <b>${amount} ${currency}</b>\n\n3. Country: <b>${country || 'N/A'}</b>\n\n4. Email: <b>${fakeEmail}</b>${methodLabel ? `\n\n<b>${methodLabel}</b>` : ''}`;

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: PAYMENT_LINK_CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const tgData = await tgResponse.json();
    if (!tgResponse.ok) {
      await supabase.from('telegram_message_log').insert({
        notification_type: 'payment_links', chat_id: PAYMENT_LINK_CHAT_ID,
        message_preview: message.slice(0, 200),
        status: 'failed', error_message: JSON.stringify(tgData).slice(0, 500),
        metadata: { user_id, full_name, amount, currency },
      });
      throw new Error(`Telegram API failed [${tgResponse.status}]: ${JSON.stringify(tgData)}`);
    }

    const telegramMessageId = tgData.result?.message_id;

    await supabase.from('telegram_message_log').insert({
      notification_type: 'payment_links', chat_id: PAYMENT_LINK_CHAT_ID,
      message_preview: message.slice(0, 200),
      telegram_message_id: telegramMessageId, status: 'sent',
      metadata: { user_id, full_name, amount, currency },
    });

    // Save request to DB
    const { data: request, error: dbErr } = await supabase
      .from('payment_link_requests')
      .insert({
        user_id,
        agent_id: agentId,
        full_name,
        amount,
        currency,
        country,
        telegram_message_id: telegramMessageId,
        status: 'pending',
      })
      .select('id')
      .single();

    if (dbErr) throw new Error(`DB error: ${dbErr.message}`);

    return new Response(JSON.stringify({ success: true, request_id: request.id, telegram_message_id: telegramMessageId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
