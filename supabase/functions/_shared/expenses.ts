// Shared helpers for tracking outgoing payments posted in the Telegram expenses group.

export const EXPENSES_CHAT_ID = "-5302551184";
const TZ = "Asia/Jerusalem";

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function parseExpense(text: string): { label: string; amount: number } | null {
  if (!text) return null;
  const clean = text.replace(/\s+/g, " ").trim();
  // Matches: 400$ | $400 | 400 USD | 1,250.50$ | 1.250,50 $
  const re = /(?:\$\s*([0-9][0-9.,]*)|([0-9][0-9.,]*)\s*(?:\$|usd|USD|Usd))/g;
  let match: RegExpExecArray | null;
  let last: { raw: string; start: number; end: number } | null = null;
  while ((match = re.exec(clean)) !== null) {
    last = { raw: match[1] ?? match[2], start: match.index, end: match.index + match[0].length };
  }
  if (!last) return null;

  const amount = normalizeAmount(last.raw);
  if (amount === null || !isFinite(amount) || amount <= 0) return null;

  const label = (clean.slice(0, last.start) + " " + clean.slice(last.end))
    .replace(/\s+/g, " ")
    .replace(/^[-–—:,.\s]+|[-–—:,.\s]+$/g, "")
    .trim();

  return { label: canonicalLabel(label || "Payment"), amount };
}

// Some vendors are posted under multiple names — normalize them to one label.
export function canonicalLabel(label: string): string {
  const up = label.toUpperCase();
  if (/\bB[\s-]?TRAFFIC\b/.test(up) || /\bBLITZ\b/.test(up)) return "BLITZ TRAFFIC";
  return label;
}

function normalizeAmount(raw: string): number | null {
  let s = raw.trim();
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // Last separator is the decimal separator
    s = s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else if (hasComma) {
    // "1,250" -> thousands; "1,50" -> decimals
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = Number(s);
  return isNaN(n) ? null : n;
}

/** Start/end (UTC ISO) of a month in Asia/Jerusalem. offsetMonths: 0 = current month. */
export function monthRange(target?: { year: number; month: number }) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "numeric",
  }).formatToParts(now);
  const curYear = Number(parts.find((p) => p.type === "year")!.value);
  const curMonth = Number(parts.find((p) => p.type === "month")!.value);

  const year = target?.year ?? curYear;
  const month = target?.month ?? curMonth;

  const start = zonedMonthStartUtc(year, month);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const end = zonedMonthStartUtc(nextYear, nextMonth);

  return { start, end, label: `${MONTHS_EN[month - 1]} ${year}` };
}

/** UTC Date for YYYY-MM-01 00:00 in Asia/Jerusalem (DST-safe). */
function zonedMonthStartUtc(year: number, month: number): Date {
  const guess = Date.UTC(year, month - 1, 1, 0, 0, 0);
  let d = new Date(guess);
  for (let i = 0; i < 3; i++) {
    const offsetMs = tzOffsetMs(d);
    const next = new Date(guess - offsetMs);
    if (next.getTime() === d.getTime()) break;
    d = next;
  }
  return d;
}

function tzOffsetMs(date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") p[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(p.year), Number(p.month) - 1, Number(p.day),
    Number(p.hour) % 24, Number(p.minute), Number(p.second),
  );
  return asUtc - date.getTime();
}

export function fmtUsd(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendTelegram(
  token: string,
  chatId: string | number,
  text: string,
  replyTo?: number,
) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        ...(replyTo ? { reply_to_message_id: replyTo, allow_sending_without_reply: true } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`sendMessage failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    }
  } catch (e) {
    console.error("sendMessage error:", e instanceof Error ? e.message : e);
  }
}

// --- Wolf of Wall Street greeting ---------------------------------------
const WOLF_GIF_IDS = [
  "119pLwyWg8ScTK", "11kIORMBw5BHos", "1N7wpCVjQJatq", "330x069s9rXvq",
  "7LgKUsZiSjcRO", "8Q31McooUHTNu", "8ymvg6pl1Lzy0", "9ijt46Acg5ji0",
  "9mZoOe2CWoeha", "CwM9k8RChLqqQ", "DRx4i20hcC7Ha", "JwLnNc3QRZzIA",
  "Lw39ENuDr0SdO", "M8x6Lk2QFmTu0", "MRxJqmk3MNta8", "NeGhTGN9EDefjKAAeY",
  "PtdOBG0BD9Vvi", "SaX384PjtDl2U", "UB5gLyMqxP0ME", "YmQLj2KxaNz58g7Ofg",
  "gdwJdym3VuXQr5OfAc", "qiPJ5kow5KOT6", "r42HxBImuzoRxsRA14",
  "sQBkCTTrJRLSE", "wZwRL2iqmV5S0",
];

// Remembers the last GIF sent so the same one is never repeated back to back.
let lastWolfGif: string | null = null;

export function isGreeting(text: string): boolean {
  return /^(hi|hey|hello|yo|sup|hii+|היי|הי)[\s!.,?]*$/i.test(text.trim());
}

export function isWhatDoYouLikeQuestion(text: string): boolean {
  return /what\s+do\s+you\s+(like|love|want|enjoy)/i.test(text.trim());
}

export function loveMoneyResponse(): string {
  const lines = [
    "I love money. Paper, plastic, crypto, metal — doesn't matter. If it buys things, I'm interested.",
    "Money. Definitely money. Followed by more money.",
    "My favorite thing? The sweet sound of a payment notification.",
    "I like long walks to the bank and watching balances go up.",
    "What do I like? Profit. Revenue. Cold hard cash. In that order.",
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

export async function sendWolfGif(token: string, chatId: string | number, replyTo?: number) {
  const pool = WOLF_GIF_IDS.filter((id) => id !== lastWolfGif);
  const id = pool[Math.floor(Math.random() * pool.length)];
  lastWolfGif = id;
  await sendGif(token, chatId, id, replyTo);
}

async function sendGif(token: string, chatId: string | number, id: string, replyTo?: number) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendAnimation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        animation: `https://media.giphy.com/media/${id}/giphy.gif`,
        ...(replyTo ? { reply_to_message_id: replyTo, allow_sending_without_reply: true } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`sendAnimation failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
    }
  } catch (e) {
    console.error("sendAnimation error:", e instanceof Error ? e.message : e);
  }
}

// --- Big-spender roasts --------------------------------------------------
// Money-burning / broke / crying GIFs used when spending gets spicy.
const SPEND_GIF_IDS = [
  "3o7btPCcdNniyf0ArS", "l0HlKrB02QY0f1mbm", "3o6Zt481isNVuQI1l6",
  "xT0xezQGU5xCDJuCPe", "l0MYt5jPR6QX5pnqM", "3orieQEA4dOJnBrEBi",
  "3o7TKMt1VVNkHV2PaE", "26ufdipQqU2lhNA4g", "l3q2K5jinAlChoCLS",
  "26tPplGWjN0xLybiU", "l41lI4bYmcsPJT9Fu", "3o6Mbsr8Rj4bZ2xrIs",
  "QMkPpxPDYY0fu", "13ZHjidRzoi7n2", "l2Sq6DYIWZbrGqOmc",
];
let lastSpendGif: string | null = null;

type Roast = { min: number; lines: string[] };

const PAYMENT_ROASTS: Roast[] = [
  { min: 10000, lines: [
    "💸 Ten grand in one message? The bank just called — they want to be friends again.",
    "🔥 At this rate we're not spending money, we're heating the office with it.",
    "🚁 That's not a payment, that's a down payment on a helicopter.",
  ] },
  { min: 5000, lines: [
    "😅 Five figures incoming... my calculator asked for a break.",
    "💳 The card is fine. The card is FINE. (The card is not fine.)",
    "📉 Accounting just aged 5 years reading this one.",
  ] },
  { min: 2000, lines: [
    "😳 Big one. Somebody's living the Jordan Belfort lifestyle.",
    "🤑 Money goes out faster than our leads answer the phone.",
    "🍾 Nice. Expensive. Both things can be true.",
  ] },
  { min: 1000, lines: [
    "👀 Casually dropping a grand like it's a coffee.",
    "💼 Noted. The CFO in me is twitching.",
  ] },
];

const MONTH_ROASTS: Roast[] = [
  { min: 50000, lines: [
    "🚨 Fifty grand this month. We're not a company, we're a charity for vendors.",
    "🏦 The monthly total has entered 'do not open the invoice folder' territory.",
  ] },
  { min: 25000, lines: [
    "😬 25k+ this month. Somebody hide the credit card.",
    "📊 The spending chart is now just a rocket emoji.",
  ] },
  { min: 10000, lines: [
    "💨 Ten grand out the door this month. Money loves us — it just doesn't stay.",
    "🧾 The monthly total is starting to look like a phone number.",
  ] },
];

function pickRoast(tiers: Roast[], amount: number): string | null {
  const tier = tiers.find((t) => amount >= t.min);
  if (!tier) return null;
  return tier.lines[Math.floor(Math.random() * tier.lines.length)];
}

/** Roast line for a payment/monthly total, or null when spending is boring. */
export function spendingRoast(paymentTotal: number, monthTotal: number): string | null {
  return pickRoast(PAYMENT_ROASTS, paymentTotal) ?? pickRoast(MONTH_ROASTS, monthTotal);
}

export async function sendSpendGif(token: string, chatId: string | number, replyTo?: number) {
  const pool = SPEND_GIF_IDS.filter((id) => id !== lastSpendGif);
  const id = pool[Math.floor(Math.random() * pool.length)];
  lastSpendGif = id;
  await sendGif(token, chatId, id, replyTo);
}

export async function monthSummary(
  supabase: any,
  target?: { year: number; month: number },
): Promise<{ total: number; count: number; label: string; top: { label: string; amount: number }[] }> {
  const { start, end, label } = monthRange(target);
  const { data, error } = await supabase
    .from("telegram_expenses")
    .select("label, amount_usd")
    .eq("chat_id", EXPENSES_CHAT_ID)
    .gte("sent_at", start.toISOString())
    .lt("sent_at", end.toISOString());

  if (error) {
    console.error("monthSummary query failed:", error.message);
    return { total: 0, count: 0, label, top: [] };
  }

  const rows = (data || []) as { label: string; amount_usd: number | string }[];
  const total = rows.reduce((s, r) => s + Number(r.amount_usd), 0);

  const byLabel = new Map<string, number>();
  for (const r of rows) {
    const key = canonicalLabel((r.label || "Payment").toUpperCase()).toUpperCase();
    byLabel.set(key, (byLabel.get(key) || 0) + Number(r.amount_usd));
  }
  const top = [...byLabel.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return { total, count: rows.length, label, top };
}

/** Parses "/total", "/total 06", "/total 2026-06". Returns undefined for current month. */
/** Most recent payments, newest first — numbering used by /list and /delete. */
async function recentExpenses(
  supabase: any,
  limit: number,
): Promise<{ id: string; label: string; amount_usd: number | string; sent_at: string }[]> {
  const { data, error } = await supabase
    .from("telegram_expenses")
    .select("id, label, amount_usd, sent_at")
    .eq("chat_id", EXPENSES_CHAT_ID)
    .order("sent_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("recentExpenses query failed:", error.message);
    return [];
  }
  return data || [];
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(new Date(iso));
}

export function parseTotalCommand(text: string): { year: number; month: number } | undefined | null {
  const m = text.trim().match(/^\/total(?:@\w+)?(?:\s+(\S+))?$/i);
  if (!m) return null;
  const arg = m[1];
  if (!arg) return undefined;
  const ym = arg.match(/^(\d{4})[-/](\d{1,2})$/);
  if (ym) return { year: Number(ym[1]), month: Number(ym[2]) };
  const mo = arg.match(/^(\d{1,2})$/);
  if (mo) {
    const month = Number(mo[1]);
    if (month >= 1 && month <= 12) {
      const year = Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(new Date()));
      return { year, month };
    }
  }
  return undefined;
}

/** Optional leading date in a line: "01.07 LABEL 400$", "01.07.2026 ...", "2026-07-01 ..." */
function extractLeadingDate(line: string): { rest: string; date: Date | null } {
  const m = line.match(/^\s*(?:(\d{4})-(\d{1,2})-(\d{1,2})|(\d{1,2})[.\/](\d{1,2})(?:[.\/](\d{2,4}))?)\s+(.*)$/);
  if (!m) return { rest: line, date: null };
  let year: number, month: number, day: number;
  if (m[1]) {
    year = Number(m[1]); month = Number(m[2]); day = Number(m[3]);
  } else {
    day = Number(m[4]); month = Number(m[5]);
    const y = m[6];
    year = y ? (y.length === 2 ? 2000 + Number(y) : Number(y))
             : Number(new Intl.DateTimeFormat("en-US", { timeZone: TZ, year: "numeric" }).format(new Date()));
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return { rest: line, date: null };
  // Noon local-ish to stay inside the intended day regardless of tz offset
  const date = new Date(Date.UTC(year, month - 1, day, 9, 0, 0));
  return { rest: m[7], date };
}

/** Handles one Telegram update for the expenses group. Returns true if it was handled. */
export async function handleExpenseUpdate(
  supabase: any,
  token: string,
  update: any,
  botId: number,
): Promise<boolean> {
  const msg = update?.message;
  if (!msg) return false;
  if (String(msg.chat?.id) !== EXPENSES_CHAT_ID) return false;
  if (msg.from?.id === botId) return false;

  const text: string = msg.text || msg.caption || "";
  if (!text.trim()) return false;

  // "hi" → random Wolf of Wall Street GIF
  if (isGreeting(text)) {
    await sendWolfGif(token, EXPENSES_CHAT_ID, msg.message_id);
    return true;
  }

  // "what do you like?" → declare unconditional love for money
  if (isWhatDoYouLikeQuestion(text)) {
    await sendTelegram(token, EXPENSES_CHAT_ID, `💰 ${loveMoneyResponse()}`, msg.message_id);
    return true;
  }

  // /menu | /help | /start — command overview
  if (/^\/(menu|help|start|commands)(?:@\w+)?$/i.test(text.trim())) {
    const body = [
      "🤖 <b>Payments Bot — Commands</b>",
      "",
      "<b>Record a payment</b>",
      "Just send the payment, e.g. <code>WITHDRAW BALANCE BAZELA 400$</code>",
      "• One payment per line — multiple lines are recorded separately",
      "• Optional leading date: <code>01.07 PHONE SYSTEM 738$</code>",
      "• Forwarded messages keep their original date",
      "",
      "<b>/total</b> — this month's total + top labels",
      "<b>/total 06</b> — total for month 06 of this year",
      "<b>/total 2026-06</b> — total for a specific month",
      "<b>/list</b> — last 10 payments (numbered)",
      "<b>/list 30</b> — last 30 payments",
      "<b>/delete &lt;number&gt;</b> — delete a payment from /list",
      "<b>/delete</b> (as a reply) — delete the replied payment",
      "<b>/menu</b> — show this menu",
      "",
      "Say <b>hi</b> for a Wolf of Wall Street GIF 🐺",
    ].join("\n");
    await sendTelegram(token, EXPENSES_CHAT_ID, body, msg.message_id);
    return true;
  }

  // /total command
  const cmd = parseTotalCommand(text);
  if (cmd !== null) {
    const s = await monthSummary(supabase, cmd);
    let body = `📊 <b>${s.label}</b>\n\nTotal: <b>${fmtUsd(s.total)}</b> (${s.count} payments)`;
    if (s.top.length > 0) {
      body += "\n\n" + s.top.map((t) => `• ${escapeHtml(t.label)} — ${fmtUsd(t.amount)}`).join("\n");
    }
    await sendTelegram(token, EXPENSES_CHAT_ID, body, msg.message_id);
    return true;
  }

  // /list [n] — recent payments, numbered for /delete
  const listCmd = text.trim().match(/^\/list(?:@\w+)?(?:\s+(\d{1,2}))?$/i);
  if (listCmd) {
    const limit = Math.min(Math.max(Number(listCmd[1] || 10), 1), 30);
    const rows = await recentExpenses(supabase, limit);
    const body = rows.length === 0
      ? "No payments recorded."
      : "🧾 <b>Recent payments</b>\n\n" + rows.map((r, i) =>
          `${i + 1}. ${escapeHtml(r.label)} — ${fmtUsd(Number(r.amount_usd))} <i>(${fmtDate(r.sent_at)})</i>`,
        ).join("\n") + "\n\nDelete: /delete &lt;number&gt;";
    await sendTelegram(token, EXPENSES_CHAT_ID, body, msg.message_id);
    return true;
  }

  // /delete <n> — deletes the nth entry from the same order as /list.
  // Also works as a reply to the original payment message.
  const delCmd = text.trim().match(/^\/(?:delete|del|remove)(?:@\w+)?(?:\s+(\d{1,2}))?$/i);
  if (delCmd) {
    let target: { id: string; label: string; amount_usd: number | string } | null = null;

    const repliedId = msg.reply_to_message?.message_id;
    if (!delCmd[1] && repliedId) {
      const { data } = await supabase
        .from("telegram_expenses")
        .select("id, label, amount_usd")
        .eq("chat_id", EXPENSES_CHAT_ID)
        .eq("telegram_message_id", repliedId)
        .maybeSingle();
      target = data ?? null;
    } else if (delCmd[1]) {
      const n = Number(delCmd[1]);
      const rows = await recentExpenses(supabase, 30);
      target = rows[n - 1] ?? null;
    } else {
      await sendTelegram(
        token,
        EXPENSES_CHAT_ID,
        "Usage: <code>/delete &lt;number&gt;</code> (numbers from /list) or reply to the payment message.",
        msg.message_id,
      );
      return true;
    }

    if (!target) {
      await sendTelegram(token, EXPENSES_CHAT_ID, "❌ Payment not found.", msg.message_id);
      return true;
    }

    const { error: delErr } = await supabase.from("telegram_expenses").delete().eq("id", target.id);
    if (delErr) {
      console.error("delete expense failed:", delErr.message);
      await sendTelegram(token, EXPENSES_CHAT_ID, "❌ Delete failed.", msg.message_id);
      return true;
    }

    const s = await monthSummary(supabase);
    await sendTelegram(
      token,
      EXPENSES_CHAT_ID,
      `🗑 Deleted: <b>${escapeHtml(target.label)}</b> — ${fmtUsd(Number(target.amount_usd))}\n\n📅 ${s.label} total: <b>${fmtUsd(s.total)}</b> (${s.count} payments)`,
      msg.message_id,
    );
    return true;
  }

  // Forwarded messages keep their original date so backfilling by forwarding works.
  const baseDate = msg.forward_date
    ? new Date(msg.forward_date * 1000)
    : msg.date
      ? new Date(msg.date * 1000)
      : new Date();

  // Every line with an amount counts as a separate payment (bulk backfill support).
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const rows: { id: number; label: string; amount: number; raw: string; sentAt: Date }[] = [];
  lines.forEach((line, i) => {
    if (/^\/(total|import|list|delete|del|remove|menu|help|start|commands)\b/i.test(line)) return;
    const { rest, date } = extractLeadingDate(line);
    const parsed = parseExpense(rest);
    if (!parsed) return;
    rows.push({
      // Line 0 keeps the real message id; later lines get collision-free negative ids.
      id: i === 0 ? msg.message_id : -(msg.message_id * 100 + i),
      label: parsed.label,
      amount: parsed.amount,
      raw: line.slice(0, 2000),
      sentAt: date ?? baseDate,
    });
  });
  if (rows.length === 0) return false;

  const { data: inserted, error } = await supabase
    .from("telegram_expenses")
    .upsert(
      rows.map((r) => ({
        chat_id: EXPENSES_CHAT_ID,
        telegram_message_id: r.id,
        label: r.label,
        amount_usd: r.amount,
        raw_text: r.raw,
        sent_at: r.sentAt.toISOString(),
      })),
      { onConflict: "chat_id,telegram_message_id", ignoreDuplicates: true },
    )
    .select("id");

  if (error) {
    console.error("insert expense failed:", error.message);
    return false;
  }
  if (!inserted || inserted.length === 0) return true; // duplicates — already replied

  const s = await monthSummary(supabase);
  const head = rows.length === 1
    ? `✅ Recorded: <b>${escapeHtml(rows[0].label)}</b> — ${fmtUsd(rows[0].amount)}`
    : `✅ ${inserted.length} payments recorded — ${fmtUsd(rows.reduce((a, r) => a + r.amount, 0))}`;
  const paymentTotal = rows.reduce((a, r) => a + r.amount, 0);
  const roast = spendingRoast(paymentTotal, s.total);
  await sendTelegram(
    token,
    EXPENSES_CHAT_ID,
    `${head}\n\n📅 ${s.label} total: <b>${fmtUsd(s.total)}</b> (${s.count} payments)` +
      (roast ? `\n\n${roast}` : ""),
    msg.message_id,
  );
  if (roast) await sendSpendGif(token, EXPENSES_CHAT_ID);
  return true;
}
