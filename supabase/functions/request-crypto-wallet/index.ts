import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FALLBACK_CHAT_ID = ""; // must be configured in platform_settings.telegram_bot.wallet_requests.chat_id

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASSET_LABEL: Record<string, { label: string; network: string }> = {
  BTC: { label: "BTC", network: "Bitcoin" },
  ETH: { label: "ETH", network: "Ethereum (ERC20)" },
  USDT_TRC20: { label: "USDT (TRC20)", network: "TRC20" },
  USDT_ERC20: { label: "USDT (ERC20)", network: "ERC20" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!LOVABLE_API_KEY || !TELEGRAM_BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "Telegram credentials not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getUser(token);
    if (claimsErr || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const agentId = claimsData.user.id;

    const body = await req.json();
    const { user_id, asset, exchange } = body ?? {};

    if (!user_id || !asset || !exchange) {
      return new Response(JSON.stringify({ error: "Missing required fields: user_id, asset, exchange" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assetInfo = ASSET_LABEL[asset];
    if (!assetInfo) {
      return new Response(JSON.stringify({ error: "Invalid asset" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["TradeRepublic", "Crypto.com"].includes(exchange)) {
      return new Response(JSON.stringify({ error: "Invalid exchange" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Read telegram_bot config for wallet_requests channel
    let CHAT_ID = FALLBACK_CHAT_ID;
    let enabled = true;
    try {
      const { data: cfg } = await supabase
        .from("platform_settings").select("value").eq("key", "telegram_bot").maybeSingle();
      const wr = (cfg?.value as any)?.wallet_requests ?? {};
      if (wr.chat_id) CHAT_ID = String(wr.chat_id);
      if (wr.enabled === false) enabled = false;
    } catch (e) { console.error("settings read failed", e); }

    if (!enabled) {
      return new Response(JSON.stringify({ error: "Wallet request notifications are disabled in settings" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!CHAT_ID) {
      return new Response(JSON.stringify({ error: "wallet_requests Telegram chat is not configured. Set it in Telegram Bot Manager." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up client info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, display_id")
      .eq("id", user_id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Client not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientName = profile.full_name || profile.email || "Unknown client";
    const clientId = profile.display_id ?? "—";

    const message =
      `need ${assetInfo.label} wallet\n\n` +
      `client name: <b>${clientName}</b>\n\n` +
      `exchange: <b>${exchange}</b>\n\n` +
      `client id: <b>#${clientId}</b>`;

    const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const tgData = await tgResponse.json();
    if (!tgResponse.ok) {
      await supabase.from("telegram_message_log").insert({
        notification_type: "wallet_requests", chat_id: CHAT_ID,
        message_preview: message.slice(0, 200),
        status: "failed", error_message: JSON.stringify(tgData).slice(0, 500),
        metadata: { user_id, asset, exchange },
      });
      throw new Error(`Telegram API failed [${tgResponse.status}]: ${JSON.stringify(tgData)}`);
    }

    const telegramMessageId = tgData.result?.message_id;

    await supabase.from("telegram_message_log").insert({
      notification_type: "wallet_requests", chat_id: CHAT_ID,
      message_preview: message.slice(0, 200),
      telegram_message_id: telegramMessageId, status: "sent",
      metadata: { user_id, asset, exchange },
    });

    const { data: request, error: dbErr } = await supabase
      .from("crypto_wallet_requests")
      .insert({
        user_id,
        agent_id: agentId,
        asset,
        network: assetInfo.network,
        exchange,
        telegram_message_id: telegramMessageId,
        status: "pending",
      })
      .select("id")
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
