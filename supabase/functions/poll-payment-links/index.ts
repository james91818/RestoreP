import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleExpenseUpdate } from "../_shared/expenses.ts";

const PAYMENT_LINK_CHAT_ID = '-5289330397';
const BOT_ID = 8622455128;
const MAX_RUNTIME_MS = 55_000;
const POLL_INTERVAL_MS = 5_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  return text.match(urlRegex) || [];
}

function extractWalletAddress(text: string): string | null {
  if (!text) return null;
  const cleaned = text.replace(/[\s,;]+/g, " ");
  const tokens = cleaned.match(/[A-Za-z0-9]{20,}/g) || [];
  if (tokens.length === 0) return null;
  tokens.sort((a, b) => b.length - a.length);
  return tokens[0];
}

const ASSET_TO_CURRENCY: Record<string, string> = {
  BTC: "BTC",
  ETH: "ETH",
  USDT_TRC20: "USDT",
  USDT_ERC20: "USDT",
};

serve(async (req) => {
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
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Read wallet_requests chat config
  let WALLET_CHAT_ID = "";
  try {
    const { data: cfg } = await supabase
      .from("platform_settings").select("value").eq("key", "telegram_bot").maybeSingle();
    const wr = (cfg?.value as any)?.wallet_requests ?? {};
    if (wr.chat_id) WALLET_CHAT_ID = String(wr.chat_id);
  } catch (_) { /* ignore */ }

  // Read polling offset (singleton row)
  let updateOffset = 0;
  try {
    const { data: stateRow } = await supabase
      .from("platform_settings").select("value").eq("key", "telegram_poll_state").maybeSingle();
    const v = (stateRow?.value as any) || {};
    if (typeof v.update_offset === "number") updateOffset = v.update_offset;
  } catch (_) { /* ignore */ }

  const startTime = Date.now();
  let totalLinks = 0;
  let totalWallets = 0;

  try {
    while (Date.now() - startTime < MAX_RUNTIME_MS) {
      // Fetch pending requests of both kinds
      const [{ data: pendingLinks, error: linksErr }, { data: pendingWallets, error: walletsErr }] =
        await Promise.all([
          supabase.from("payment_link_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
          supabase.from("crypto_wallet_requests").select("*").eq("status", "pending").order("created_at", { ascending: true }),
        ]);

      if (linksErr) throw new Error(`DB fetch payment_link_requests: ${linksErr.message}`);
      if (walletsErr) throw new Error(`DB fetch crypto_wallet_requests: ${walletsErr.message}`);

      const haveLinks = (pendingLinks?.length ?? 0) > 0;
      const haveWallets = (pendingWallets?.length ?? 0) > 0;

      // Telegram getUpdates with offset (single shared poller)
      const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offset: updateOffset,
          timeout: 2,
          allowed_updates: ['message'],
        }),
      });

      const tgData = await tgResponse.json().catch(() => ({}));
      if (!tgResponse.ok) {
        // Transient gateway / Telegram errors (502, 409 conflict) — back off & retry next iteration.
        console.warn(`Telegram getUpdates non-OK [${tgResponse.status}]: ${JSON.stringify(tgData).slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      const updates = tgData.result || [];

      // === Outgoing payment expenses group ===
      for (const u of updates) {
        try {
          await handleExpenseUpdate(supabase, TELEGRAM_BOT_TOKEN, u, BOT_ID);
        } catch (e) {
          console.error("expense handler error:", e instanceof Error ? e.message : e);
        }
      }

      // === Payment link matching ===
      if (haveLinks) {
        const linkMessages = updates
          .filter((u: any) => {
            const msg = u.message;
            if (!msg) return false;
            if (msg.chat?.id !== Number(PAYMENT_LINK_CHAT_ID)) return false;
            if (msg.from?.id === BOT_ID) return false;
            const text = msg.text || msg.caption || '';
            return extractUrls(text).length > 0;
          })
          .map((u: any) => ({
            message_id: u.message.message_id,
            urls: extractUrls(u.message.text || u.message.caption || ''),
            reply_to: u.message.reply_to_message?.message_id || null,
          }));

        for (const pending of pendingLinks!) {
          let matched = linkMessages.find((lm: any) => lm.reply_to === pending.telegram_message_id);
          if (!matched) {
            matched = linkMessages.find((lm: any) => lm.message_id > pending.telegram_message_id && !lm.reply_to);
          }
          if (!matched) continue;

          const paymentLink = matched.urls[0];
          const { error: updErr } = await supabase
            .from('payment_link_requests')
            .update({ payment_link: paymentLink, status: 'fulfilled', fulfilled_at: new Date().toISOString() })
            .eq('id', pending.id);
          if (updErr) { console.error(`update payment_link ${pending.id}:`, updErr.message); continue; }

          await supabase.from('notifications').insert({
            user_id: pending.agent_id,
            title: 'Payment Link Received',
            message: `Payment link for ${pending.full_name} (${pending.amount} ${pending.currency}) is ready.`,
            type: 'payment_link',
          });
          totalLinks++;
          const idx = linkMessages.indexOf(matched);
          if (idx > -1) linkMessages.splice(idx, 1);
        }
      }

      // === Crypto wallet matching ===
      if (haveWallets && WALLET_CHAT_ID) {
        const replyMessages = updates
          .filter((u: any) => {
            const m = u.message;
            if (!m) return false;
            if (m.chat?.id !== Number(WALLET_CHAT_ID)) return false;
            if (m.from?.id === BOT_ID) return false;
            if (!m.reply_to_message?.message_id) return false;
            const text = m.text || m.caption || "";
            return !!extractWalletAddress(text);
          })
          .map((u: any) => ({
            message_id: u.message.message_id,
            reply_to: u.message.reply_to_message.message_id,
            address: extractWalletAddress(u.message.text || u.message.caption || ""),
          }));

        for (const wreq of pendingWallets!) {
          const matched = replyMessages.find((rm: any) => rm.reply_to === wreq.telegram_message_id);
          if (!matched || !matched.address) continue;

          const currency = ASSET_TO_CURRENCY[wreq.asset] ?? wreq.asset;
          const label = `${wreq.exchange} (${wreq.network || wreq.asset})`;

          const { error: insertAddrErr } = await supabase
            .from("client_crypto_addresses")
            .insert({
              user_id: wreq.user_id,
              currency,
              address: matched.address,
              network: wreq.network ?? "",
              label,
            });
          if (insertAddrErr) {
            console.error(`insert crypto address ${wreq.id}:`, insertAddrErr.message);
          }

          const { error: updErr } = await supabase
            .from("crypto_wallet_requests")
            .update({ wallet_address: matched.address, status: "fulfilled", fulfilled_at: new Date().toISOString() })
            .eq("id", wreq.id);
          if (updErr) { console.error(`update wallet req ${wreq.id}:`, updErr.message); continue; }

          // Look up client info
          let clientLabel = "client";
          try {
            const { data: prof } = await supabase
              .from("profiles").select("full_name, email, display_id").eq("id", wreq.user_id).maybeSingle();
            if (prof) {
              const name = (prof.full_name || prof.email || "client").trim();
              clientLabel = prof.display_id ? `${name} (#${prof.display_id})` : name;
            }
          } catch (_) { /* ignore */ }

          if (wreq.agent_id) {
            await supabase.from("notifications").insert({
              user_id: wreq.agent_id,
              title: `✅ ${currency} Wallet Received`,
              message: `PSP sent the ${currency} wallet for ${clientLabel}: ${matched.address.slice(0, 14)}…`,
              type: "wallet_received",
              priority: 3,
            });
          }
          totalWallets++;
          const idx = replyMessages.indexOf(matched);
          if (idx > -1) replyMessages.splice(idx, 1);
        }
      }

      // Advance offset so processed updates aren't returned again
      if (updates.length > 0) {
        const maxId = Math.max(...updates.map((u: any) => u.update_id));
        updateOffset = maxId + 1;
        await supabase.from("platform_settings").upsert({
          key: "telegram_poll_state",
          value: { update_offset: updateOffset },
          updated_at: new Date().toISOString(),
        });
      }

      if (Date.now() - startTime + POLL_INTERVAL_MS < MAX_RUNTIME_MS) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      } else {
        break;
      }
    }

    return new Response(JSON.stringify({ ok: true, fulfilled_links: totalLinks, fulfilled_wallets: totalWallets, offset: updateOffset }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Poll error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
