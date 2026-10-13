import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1xI5ViYoGxdVM32xMoDYkuQw3SovD_-zumwuKbKckOnM";

// Tables backed up, in restore order (parents before children).
const TABLES: string[] = [
  "roles",
  "permissions",
  "role_permissions",
  "profiles",
  "user_roles",
  "teams",
  "team_members",
  "assets",
  "wallets",
  "deposits",
  "withdrawals",
  "swaps",
  "trades",
  "trade_overrides",
  "staking_plans",
  "user_stakes",
  "copy_traders",
  "copy_subscriptions",
  "copied_trades",
  "affiliates",
  "affiliate_deals",
  "affiliate_topups",
  "pending_retention",
  "client_bank_details",
  "client_crypto_addresses",
  "kyc_documents",
  "admin_notes",
  "appointments",
  "appointment_requests",
  "support_tickets",
  "ticket_messages",
  "chat_rooms",
  "chat_messages",
  "staff_tasks",
  "lead_statuses",
  "tier_trade_limits",
  "platform_settings",
  "welcome_bank_accounts",
  "payment_link_presets",
  "phone_prefixes",
  "phone_prefix_roles",
  "price_alerts",
  "watchlist",
  "btc_address_pool",
  "report_settings",
  "testimonials",
  "referrals",
];

const PAGE = 1000;
const WRITE_CHUNK = 2000;

const MIN_INTERVAL_MS = 1100;
let lastCall = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function gwFetch(path: string, init: RequestInit = {}): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY")!;

  for (let attempt = 0; attempt < 4; attempt++) {
    const wait = MIN_INTERVAL_MS - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();

    const res = await fetch(`${GATEWAY_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_SHEETS_API_KEY,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    if (res.ok) return text ? JSON.parse(text) : {};

    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      const retryAfter = Number(res.headers.get("Retry-After")) || 0;
      await sleep(retryAfter > 0 ? retryAfter * 1000 + 1000 : 20000 * (attempt + 1));
      continue;
    }
    throw new Error(`Sheets API ${res.status}: ${text.slice(0, 400)}`);
  }
  throw new Error("Sheets API: retries exhausted");
}

function colLetter(n: number) {
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s || "A";
}

function cell(v: unknown): string | number | boolean {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

type SheetMap = Record<string, { sheetId: number; rowCount: number; columnCount: number }>;

async function loadSheets(): Promise<SheetMap> {
  const meta = await gwFetch(`/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`);
  const map: SheetMap = {};
  for (const s of meta.sheets || []) {
    map[s.properties.title] = {
      sheetId: s.properties.sheetId,
      rowCount: s.properties.gridProperties?.rowCount ?? 1000,
      columnCount: s.properties.gridProperties?.columnCount ?? 26,
    };
  }
  return map;
}

async function ensureTab(map: SheetMap, title: string, rows: number, cols: number) {
  const needRows = Math.max(rows + 10, 100);
  const needCols = Math.max(cols + 2, 12);
  let entry = map[title];
  if (!entry) {
    const created = await gwFetch(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: {
              title,
              gridProperties: { rowCount: needRows, columnCount: needCols, frozenRowCount: 1 },
            },
          },
        }],
      }),
    });
    const p = created.replies[0].addSheet.properties;
    entry = { sheetId: p.sheetId, rowCount: p.gridProperties.rowCount, columnCount: p.gridProperties.columnCount };
    map[title] = entry;
    return entry;
  }
  if (entry.rowCount < needRows || entry.columnCount < needCols) {
    await gwFetch(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          updateSheetProperties: {
            properties: {
              sheetId: entry.sheetId,
              gridProperties: {
                rowCount: Math.max(entry.rowCount, needRows),
                columnCount: Math.max(entry.columnCount, needCols),
                frozenRowCount: 1,
              },
            },
            fields: "gridProperties(rowCount,columnCount,frozenRowCount)",
          },
        }],
      }),
    });
    entry.rowCount = Math.max(entry.rowCount, needRows);
    entry.columnCount = Math.max(entry.columnCount, needCols);
  }
  return entry;
}

async function writeTab(map: SheetMap, title: string, values: (string | number | boolean)[][]) {
  const cols = values.reduce((m, r) => Math.max(m, r.length), 1);
  const isNew = !map[title];
  await ensureTab(map, title, values.length, cols);
  // Clear old content (not needed for a freshly created tab)
  if (!isNew) {
    await gwFetch(`/spreadsheets/${SPREADSHEET_ID}/values/'${title}'!A1:ZZ50000:clear`, { method: "POST", body: "{}" });
  }
  const endCol = colLetter(cols);
  for (let i = 0; i < values.length; i += WRITE_CHUNK) {
    const chunk = values.slice(i, i + WRITE_CHUNK).map((r) => {
      const row = r.slice();
      while (row.length < cols) row.push("");
      return row;
    });
    const startRow = i + 1;
    const endRow = i + chunk.length;
    await gwFetch(
      `/spreadsheets/${SPREADSHEET_ID}/values/'${title}'!A${startRow}:${endCol}${endRow}?valueInputOption=RAW`,
      { method: "PUT", body: JSON.stringify({ values: chunk }) },
    );
  }
}

async function dumpTable(supabase: any, table: string): Promise<(string | number | boolean)[][]> {
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    if (rows.length >= 100000) break;
  }
  if (!rows.length) return [["(empty)"]];
  const cols = Object.keys(rows[0]);
  return [cols, ...rows.map((r) => cols.map((c) => cell(r[c])))];
}

function readmeValues(stamp: string, results: { table: string; rows: number; error?: string }[]) {
  const head: (string | number | boolean)[][] = [
    ["CRYPTO-BÖRSE BACKOFFICE BACKUP — RESTORE INSTRUCTIONS"],
    [""],
    ["Last backup (UTC)", stamp],
    [""],
    ["WHAT THIS IS"],
    ["Each tab below is a full copy of one database table from the backoffice."],
    ["Row 1 of every tab contains the exact database column names. Every following row is one record."],
    ["Values are raw database values. JSON / array columns are stored as JSON text."],
    ["Empty cells mean NULL. Timestamps are ISO 8601 UTC. IDs are UUIDs and must be kept as-is."],
    [""],
    ["HOW TO RESTORE INTO A NEW LOVABLE PROJECT"],
    ["1. Give the new project this spreadsheet and say: restore the backoffice from these tabs."],
    ["2. Create the tables with the same names and columns as row 1 of each tab (all in schema public)."],
    ["3. Insert the rows in the tab order listed below — parents come before children, so foreign keys work."],
    ["4. Users: the 'profiles' tab holds one row per user, and profiles.id equals the auth user id."],
    ["   Recreate auth users with those exact ids and emails first, then insert profiles."],
    ["5. Disable triggers (or insert with service role) while importing, so wallet/FTD automations do not fire again."],
    ["6. Balances live in 'wallets'; trade history in 'trades' (+ 'trade_overrides'); staking in 'user_stakes';"],
    ["   copy trading in 'copy_subscriptions' / 'copied_trades'; money movements in 'deposits' / 'withdrawals' / 'swaps'."],
    ["7. Leads vs clients: profiles.is_lead = TRUE is a lead, FALSE with first_deposit_at set is a depositor."],
    ["8. Roles/permissions come from 'roles', 'permissions', 'role_permissions', 'user_roles'."],
    [""],
    ["TABS IN THIS BACKUP (restore in this order)"],
    ["#", "Table / tab", "Rows", "Status"],
  ];
  results.forEach((r, i) => head.push([i + 1, r.table, r.rows, r.error ? `ERROR: ${r.error}` : "ok"]));
  return head;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = new Date();
  let runId: string | null = null;
  const results: { table: string; rows: number; error?: string }[] = [];

  try {
    const { data: run } = await supabase
      .from("backup_runs")
      .insert({ status: "running" })
      .select("id")
      .single();
    runId = run?.id ?? null;

    const map = await loadSheets();

    for (const table of TABLES) {
      try {
        const values = await dumpTable(supabase, table);
        await writeTab(map, table, values);
        results.push({ table, rows: Math.max(values.length - 1, 0) });
      } catch (e: any) {
        console.error(`backup ${table} failed:`, e?.message || e);
        results.push({ table, rows: 0, error: String(e?.message || e).slice(0, 200) });
      }
    }

    // Login passwords: back up the one-way password hashes so every user keeps
    // their exact password after a restore (restore via restore_auth_password_hash).
    try {
      const { data: users, error } = await supabase.rpc("backup_auth_password_hashes");
      if (error) throw new Error(error.message);
      const vals: (string | number | boolean)[][] = [["id", "email", "encrypted_password", "created_at"]];
      for (const u of users ?? []) vals.push([u.id, u.email ?? "", u.encrypted_password ?? "", u.created_at ?? ""]);
      await writeTab(map, "_auth_passwords", vals);
      results.push({ table: "_auth_passwords", rows: vals.length - 1 });
    } catch (e: any) {
      results.push({ table: "_auth_passwords", rows: 0, error: String(e?.message || e).slice(0, 200) });
    }

    const stamp = startedAt.toISOString().replace("T", " ").slice(0, 19);
    await writeTab(map, "_README", readmeValues(stamp, results));

    const failed = results.filter((r) => r.error);
    const totalRows = results.reduce((s, r) => s + r.rows, 0);

    if (runId) {
      await supabase.from("backup_runs").update({
        status: failed.length ? "partial" : "success",
        tables_backed_up: results.length - failed.length,
        total_rows: totalRows,
        error_message: failed.length ? failed.map((f) => `${f.table}: ${f.error}`).join(" | ").slice(0, 1000) : null,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }

    return new Response(JSON.stringify({ success: true, tables: results.length, totalRows, failed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const msg = err?.message || String(err);
    console.error("backup-to-sheets error:", msg);
    if (runId) {
      await supabase.from("backup_runs").update({
        status: "failed",
        error_message: msg.slice(0, 1000),
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
