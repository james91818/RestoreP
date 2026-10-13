import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FALLBACK_CHAT_ID = '';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (!LOVABLE_API_KEY || !TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Telegram credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Read config from platform_settings
  let chatId = FALLBACK_CHAT_ID;
  let enabled = true;
  try {
    const { data: cfg } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'telegram_bot')
      .maybeSingle();
    const leadsCfg = (cfg?.value as any)?.leads ?? {};
    if (leadsCfg.chat_id) chatId = String(leadsCfg.chat_id);
    if (leadsCfg.enabled === false) enabled = false;
  } catch (e) {
    console.error('Failed to read telegram_bot settings:', e);
  }

  if (!enabled) {
    return new Response(JSON.stringify({ success: true, skipped: 'disabled' }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    if (body?.force_chat_id) {
      chatId = String(body.force_chat_id);
    }
    const notificationType: string = body?.notification_type || 'leads';

    if (!chatId.trim()) {
      await supabase.from('telegram_message_log').insert({
        notification_type: notificationType,
        chat_id: 'not_configured',
        message_preview: 'New lead notification skipped: Telegram chat ID is not configured.',
        status: 'failed',
        error_message: 'Telegram leads chat_id is not configured in platform_settings.telegram_bot.leads.chat_id',
      });
      return new Response(JSON.stringify({ success: true, skipped: 'chat_not_configured' }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = `🚨 <b>New Lead Registered!</b>\n\nA new lead has just signed up. Check the back office for details.`;

    // Try original chat id first; if it fails and id starts with "-" but not "-100", retry with "-100" prefix (supergroup format)
    const chatIdsToTry: string[] = [chatId];
    if (chatId.startsWith('-') && !chatId.startsWith('-100')) {
      chatIdsToTry.push(`-100${chatId.slice(1)}`);
    }

    let response: Response | null = null;
    let data: any = null;
    let lastChatId = chatId;
    for (const cid of chatIdsToTry) {
      lastChatId = cid;
      response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ chat_id: cid, text: message, parse_mode: 'HTML' }),
      });
      data = await response.json();
      if (response.ok) break;
      console.warn(`Telegram send failed for chat ${cid}:`, JSON.stringify(data));
    }

    if (!response || !response.ok) {
      await supabase.from('telegram_message_log').insert({
        notification_type: notificationType, chat_id: lastChatId,
        message_preview: message.slice(0, 200),
        status: 'failed', error_message: JSON.stringify(data).slice(0, 500),
      });
      throw new Error(`Telegram API call failed [${response?.status}]: ${JSON.stringify(data)}`);
    }

    await supabase.from('telegram_message_log').insert({
      notification_type: notificationType, chat_id: lastChatId,
      message_preview: message.slice(0, 200),
      telegram_message_id: data.result?.message_id, status: 'sent',
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error sending Telegram notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
