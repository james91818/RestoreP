// Telegram group AI assistant — mirrors the backoffice AI assistant (Admin role).
// Listens to messages in allowed group chats and replies with full tool access.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Allowed Telegram chat IDs (group). Add more here if needed.
const ALLOWED_CHAT_IDS = new Set<number>([-5418681226, -1005418681226]);

// Caller identity for tools (admin = Thomas, full access)
const ADMIN_USER_ID = "5d815b4f-8b9c-449c-b92d-cc0aaed27686";

// Recent updates dedupe (per-instance, best-effort)
const seen = new Set<number>();

// ── Tool definitions (mirror backoffice-ai) ──
const tools = [
  { type: "function", function: { name: "search_users", description: "Search users/leads/depositors by name, email, phone, status. Returns up to 20.", parameters: { type: "object", properties: { query: { type: "string" }, is_lead: { type: "boolean" }, status: { type: "string" }, limit: { type: "number" } } } } },
  { type: "function", function: { name: "get_user_details", description: "Detailed info: wallets, recent trades, deposits, withdrawals.", parameters: { type: "object", properties: { user_id: { type: "string" } }, required: ["user_id"] } } },
  { type: "function", function: { name: "update_user_status", description: "Update user status.", parameters: { type: "object", properties: { user_id: { type: "string" }, status: { type: "string" } }, required: ["user_id", "status"] } } },
  { type: "function", function: { name: "update_wallet_balance", description: "Set wallet balance for currency.", parameters: { type: "object", properties: { user_id: { type: "string" }, currency: { type: "string" }, balance: { type: "number" } }, required: ["user_id", "currency", "balance"] } } },
  { type: "function", function: { name: "manage_deposit", description: "Approve or reject a deposit.", parameters: { type: "object", properties: { deposit_id: { type: "string" }, action: { type: "string", enum: ["approve", "reject"] }, notes: { type: "string" } }, required: ["deposit_id", "action"] } } },
  { type: "function", function: { name: "manage_withdrawal", description: "Approve or reject a withdrawal.", parameters: { type: "object", properties: { withdrawal_id: { type: "string" }, action: { type: "string", enum: ["approve", "reject"] }, notes: { type: "string" } }, required: ["withdrawal_id", "action"] } } },
  { type: "function", function: { name: "send_notification", description: "Send notification to a user.", parameters: { type: "object", properties: { user_id: { type: "string" }, title: { type: "string" }, message: { type: "string" }, type: { type: "string", enum: ["info", "success", "warning", "error"] } }, required: ["user_id", "title", "message"] } } },
  { type: "function", function: { name: "list_pending_deposits", description: "List pending deposits.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_pending_withdrawals", description: "List pending withdrawals.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "get_platform_stats", description: "Platform overview stats.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "assign_agent", description: "Assign agent to a user.", parameters: { type: "object", properties: { user_id: { type: "string" }, agent_id: { type: "string" } }, required: ["user_id", "agent_id"] } } },
  { type: "function", function: { name: "list_staff", description: "List all staff with roles.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "add_admin_note", description: "Add internal admin note.", parameters: { type: "object", properties: { user_id: { type: "string" }, content: { type: "string" } }, required: ["user_id", "content"] } } },
  { type: "function", function: { name: "manage_trade", description: "Close an open trade.", parameters: { type: "object", properties: { trade_id: { type: "string" }, action: { type: "string", enum: ["close"] }, pnl: { type: "number" } }, required: ["trade_id", "action"] } } },
  { type: "function", function: { name: "create_deposit", description: "Create a manual deposit for a user.", parameters: { type: "object", properties: { user_id: { type: "string" }, amount: { type: "number" }, currency: { type: "string" }, method: { type: "string" }, status: { type: "string", enum: ["pending", "approved"] } }, required: ["user_id", "amount"] } } },
  { type: "function", function: { name: "list_recent_leads", description: "List leads created in the last N days (default 1 = today) with status and latest admin note/comment.", parameters: { type: "object", properties: { days: { type: "number" }, limit: { type: "number" } } } } },
];

async function executeTool(sb: ReturnType<typeof createClient>, caller: string, name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "search_users": {
        let q = sb.from("profiles").select("id, display_id, full_name, email, phone, status, country, is_lead, created_at, first_deposit_at, assigned_agent");
        if (args.query) { const t = `%${args.query}%`; q = q.or(`full_name.ilike.${t},email.ilike.${t},phone.ilike.${t}`); }
        if (args.is_lead !== undefined) q = q.eq("is_lead", args.is_lead);
        if (args.status) q = q.eq("status", args.status as string);
        const { data, error } = await q.order("created_at", { ascending: false }).limit((args.limit as number) || 20);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify(data);
      }
      case "get_user_details": {
        const [profile, wallets, trades, deposits, withdrawals] = await Promise.all([
          sb.from("profiles").select("*").eq("id", args.user_id as string).single(),
          sb.from("wallets").select("*").eq("user_id", args.user_id as string),
          sb.from("trades").select("*, assets(symbol, name)").eq("user_id", args.user_id as string).order("opened_at", { ascending: false }).limit(10),
          sb.from("deposits").select("*").eq("user_id", args.user_id as string).order("created_at", { ascending: false }).limit(10),
          sb.from("withdrawals").select("*").eq("user_id", args.user_id as string).order("created_at", { ascending: false }).limit(10),
        ]);
        return JSON.stringify({ profile: profile.data, wallets: wallets.data, recent_trades: trades.data, recent_deposits: deposits.data, recent_withdrawals: withdrawals.data });
      }
      case "update_user_status": {
        const { error } = await sb.from("profiles").update({ status: args.status as string }).eq("id", args.user_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "update_wallet_balance": {
        const { error } = await sb.from("wallets").update({ balance: args.balance as number }).eq("user_id", args.user_id as string).eq("currency", args.currency as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "manage_deposit": {
        const newStatus = args.action === "approve" ? "approved" : "rejected";
        const update: Record<string, unknown> = { status: newStatus, processed_by: caller };
        if (args.notes) update.admin_notes = args.notes;
        const { error } = await sb.from("deposits").update(update).eq("id", args.deposit_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "manage_withdrawal": {
        const newStatus = args.action === "approve" ? "approved" : "rejected";
        const update: Record<string, unknown> = { status: newStatus, processed_by: caller };
        if (args.notes) update.admin_notes = args.notes;
        const { error } = await sb.from("withdrawals").update(update).eq("id", args.withdrawal_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "send_notification": {
        const { error } = await sb.from("notifications").insert({ user_id: args.user_id as string, title: args.title as string, message: args.message as string, type: (args.type as string) || "info" });
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "list_pending_deposits": {
        const { data, error } = await sb.from("deposits").select("id, user_id, amount, currency, method, created_at, profiles!inner(full_name, email)").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify(data);
      }
      case "list_pending_withdrawals": {
        const { data, error } = await sb.from("withdrawals").select("id, user_id, amount, currency, method, destination, created_at, profiles!inner(full_name, email)").eq("status", "pending").order("created_at", { ascending: false }).limit(50);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify(data);
      }
      case "get_platform_stats": {
        const [users, leads, deps, pendingDeps, pendingWds] = await Promise.all([
          sb.from("profiles").select("id", { count: "exact", head: true }),
          sb.from("profiles").select("id", { count: "exact", head: true }).eq("is_lead", true),
          sb.from("profiles").select("id", { count: "exact", head: true }).eq("is_lead", false),
          sb.from("deposits").select("id, amount", { count: "exact" }).eq("status", "pending"),
          sb.from("withdrawals").select("id, amount", { count: "exact" }).eq("status", "pending"),
        ]);
        return JSON.stringify({
          total_users: users.count, total_leads: leads.count, total_depositors: deps.count,
          pending_deposits: { count: pendingDeps.count, total: pendingDeps.data?.reduce((s: number, d: any) => s + (d.amount || 0), 0) },
          pending_withdrawals: { count: pendingWds.count, total: pendingWds.data?.reduce((s: number, w: any) => s + (w.amount || 0), 0) },
        });
      }
      case "assign_agent": {
        const { error } = await sb.from("profiles").update({ assigned_agent: args.agent_id as string }).eq("id", args.user_id as string);
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "list_staff": {
        const { data, error } = await sb.from("user_roles").select("user_id, roles(name), profiles:user_id(full_name, email)");
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify(data);
      }
      case "add_admin_note": {
        const { error } = await sb.from("admin_notes").insert({ user_id: args.user_id as string, author_id: caller, content: args.content as string });
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "manage_trade": {
        if (args.action === "close") {
          const update: Record<string, unknown> = { status: "closed", closed_at: new Date().toISOString() };
          if (args.pnl !== undefined) update.pnl = args.pnl;
          const { data: rows, error } = await sb.from("trades").update(update).eq("id", args.trade_id as string).eq("status", "open").select("id, user_id, size, pnl");
          if (error) return JSON.stringify({ error: error.message });
          if (!rows || rows.length === 0) return JSON.stringify({ success: true, message: "Trade already closed" });
          const closed = rows[0] as any;
          const finalPnl = args.pnl !== undefined ? Number(args.pnl) : Number(closed.pnl ?? 0);
          const { data: wallet } = await sb.from("wallets").select("id, balance").eq("user_id", closed.user_id).eq("currency", "EUR").maybeSingle();
          if (wallet) await sb.from("wallets").update({ balance: Number(wallet.balance) + Number(closed.size) + finalPnl }).eq("id", (wallet as any).id);
          return JSON.stringify({ success: true });
        }
        return JSON.stringify({ error: "Unknown action" });
      }
      case "create_deposit": {
        const { error } = await sb.from("deposits").insert({ user_id: args.user_id as string, amount: args.amount as number, currency: (args.currency as string) || "EUR", method: (args.method as string) || "bank", status: (args.status as string) || "pending" });
        return error ? JSON.stringify({ error: error.message }) : JSON.stringify({ success: true });
      }
      case "list_recent_leads": {
        const days = (args.days as number) ?? 1;
        const limit = (args.limit as number) ?? 50;
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
        const { data: leads, error } = await sb
          .from("profiles")
          .select("id, display_id, full_name, email, phone, status, country, created_at, assigned_agent")
          .eq("is_lead", true)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(limit);
        if (error) return JSON.stringify({ error: error.message });
        const ids = (leads || []).map((l: any) => l.id);
        let notesByUser: Record<string, any[]> = {};
        if (ids.length) {
          const { data: notes } = await sb.from("admin_notes").select("user_id, content, created_at").in("user_id", ids).order("created_at", { ascending: false });
          for (const n of (notes || []) as any[]) {
            (notesByUser[n.user_id] ||= []).push({ content: n.content, created_at: n.created_at });
          }
        }
        const enriched = (leads || []).map((l: any) => ({ ...l, latest_note: notesByUser[l.id]?.[0]?.content || null, notes_count: notesByUser[l.id]?.length || 0 }));
        return JSON.stringify({ count: enriched.length, days, leads: enriched });
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({ error: e instanceof Error ? e.message : "Tool failed" });
  }
}

async function tgSendRaw(chatId: number, text: string, replyTo: number | undefined, parseMode?: string) {
  const body: Record<string, unknown> = { chat_id: chatId, text, reply_to_message_id: replyTo };
  if (parseMode) body.parse_mode = parseMode;
  const r = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    console.error("tgSend failed", r.status, parseMode || "plain", errText.slice(0, 300));
    return false;
  }
  return true;
}

async function tgSend(chatId: number, text: string, replyTo?: number) {
  // Telegram messages cap at 4096 chars
  const chunks: string[] = [];
  let t = text;
  while (t.length > 4000) { chunks.push(t.slice(0, 4000)); t = t.slice(4000); }
  chunks.push(t);
  for (const chunk of chunks) {
    // Try Markdown first; fall back to plain text if Telegram rejects (bad entities)
    const ok = await tgSendRaw(chatId, chunk, replyTo, "Markdown").catch((e) => { console.error("tgSend err:", e); return false; });
    if (!ok) {
      await tgSendRaw(chatId, chunk, replyTo).catch((e) => console.error("tgSend plain err:", e));
    }
  }
}

async function tgTyping(chatId: number) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendChatAction`, {
    method: "POST",
    body: JSON.stringify({ chat_id: chatId, action: "typing" }),
  }).catch(() => {});
}

const SYSTEM_PROMPT = `You are an AI assistant for g-backoffice, operating in a Telegram group chat. You are acting with full Admin permissions.

You can perform actions using the tools available. Be concise — Telegram messages should be short and scannable. Use simple Markdown (bold *text*, lists with - ). Avoid tables.

Guidelines:
- When users ask about clients/leads, search first
- Confirm destructive actions only if ambiguous; otherwise execute when clearly instructed
- Always show client name + ID when referencing users
- Format currency with 2 decimals
- Keep replies under ~1500 chars when possible
- If a tool errors, explain briefly`;

async function handleMessage(chatId: number, text: string, messageId: number) {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  await tgTyping(chatId);

  let conv: any[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: text },
  ];

  for (let i = 0; i < 6; i++) {
    const r = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: conv, tools, stream: false }),
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error("AI error", r.status, errText);
      const detail = errText.slice(0, 300);
      await tgSend(chatId, r.status === 429 ? "⚠️ Rate limit — try again." : r.status === 402 ? "⚠️ AI credits exhausted." : `⚠️ AI service error (${r.status}): ${detail}`, messageId);
      return;
    }
    const data = await r.json();
    const choice = data.choices?.[0];
    if (!choice) { await tgSend(chatId, `⚠️ No AI response. Raw: ${JSON.stringify(data).slice(0, 400)}`, messageId); return; }

    if (choice.finish_reason === "tool_calls" || choice.message?.tool_calls?.length) {
      conv.push(choice.message);
      for (const tc of choice.message.tool_calls) {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(tc.function.arguments); } catch {}
        console.log("tool:", tc.function.name, args);
        const result = await executeTool(sb, ADMIN_USER_ID, tc.function.name, args);
        conv.push({ role: "tool", tool_call_id: tc.id, content: result });
      }
      continue;
    }

    const final = choice.message?.content || "(no response)";
    await tgSend(chatId, final, messageId);
    return;
  }
  await tgSend(chatId, "⚠️ Reached maximum reasoning steps.", messageId);
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  try {
    const update = await req.json();
    const msg = update.message ?? update.edited_message;
    if (!msg?.chat?.id || typeof update.update_id !== "number") {
      return new Response(JSON.stringify({ ok: true, ignored: true }));
    }
    if (seen.has(update.update_id)) return new Response(JSON.stringify({ ok: true, dup: true }));
    seen.add(update.update_id);
    if (seen.size > 500) { const arr = [...seen]; arr.slice(0, 250).forEach(x => seen.delete(x)); }

    const chatId: number = msg.chat.id;
    if (!ALLOWED_CHAT_IDS.has(chatId)) {
      console.log("Ignored chat:", chatId);
      return new Response(JSON.stringify({ ok: true, ignored: true }));
    }

    const text: string = (msg.text || msg.caption || "").trim();
    if (!text) return new Response(JSON.stringify({ ok: true }));
    if (msg.from?.is_bot) return new Response(JSON.stringify({ ok: true }));

    // Fire-and-forget so Telegram gets quick 200
    handleMessage(chatId, text, msg.message_id).catch(async (e) => {
      console.error("handle err:", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      await tgSend(chatId, `⚠️ Something went wrong: ${errMsg.slice(0, 500)}`, msg.message_id).catch(() => {});
    });

    return new Response(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error("webhook err:", e);
    return new Response(JSON.stringify({ ok: true }));
  }
});
