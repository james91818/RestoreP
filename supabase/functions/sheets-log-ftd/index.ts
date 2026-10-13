import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SPREADSHEET_ID = "1cob55H6IZqoffUFgLeAtsPtf5ZFibId3aJCrt68fOMw";

const HEADERS = [
  "BRAND", "DEPOSIT DATE", "REG DATE", "CRM ID", "EMAIL", "NAME OF CLIENT",
  "AMOUNT", "CUR", "AMOUNT $", "PROCESSOR", "CON AGENT", "CAMPAIGN",
  "AFFILIATE", "COUNTRY", "RET AGENT", "STATUS", "APPROVED MONTH",
  "Fee to Aff", "NOTE $", "SETTLED", "SETTLE DATE", "BTC", "OR USD",
  "WALLET", "CHB/WD", "DATE WD",
];

const MONTHS = ["January","February","March","April","May","June",
  "July","August","September","October","November","December"];

function monthTabName(d: Date) {
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

async function gwFetch(path: string, init: RequestInit = {}) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const GOOGLE_SHEETS_API_KEY = Deno.env.get("GOOGLE_SHEETS_API_KEY")!;
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
  if (!res.ok) {
    throw new Error(`Sheets API ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

async function ensureMonthTab(tabName: string) {
  const meta = await gwFetch(`/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties`);
  let sheet = (meta.sheets || []).find((s: any) => s.properties?.title === tabName);
  let sheetId: number;

  if (!sheet) {
    const created = await gwFetch(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: {
              title: tabName,
              gridProperties: { rowCount: 1000, columnCount: 32, frozenRowCount: 1 },
              tabColor: { red: 0.83, green: 0.69, blue: 0.22 }, // gold
            },
          },
        }],
      }),
    });
    sheetId = created.replies[0].addSheet.properties.sheetId;
  } else {
    sheetId = sheet.properties.sheetId;
  }

  // Write header row + summary formulas (idempotent)
  await gwFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/'${tabName}'!A1:AE1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({
        values: [[
          ...HEADERS,
          "TOTAL AMOUNT (EUR)",
          `=SUMIF(H2:H,"EUR",G2:G)+SUMIF(H2:H,"USD",G2:G)`,
          "TOTAL FTDs",
          `=COUNTA(E2:E)`,
        ]],
      }),
    },
  );

  // Apply professional formatting
  const goldBg = { red: 0.83, green: 0.69, blue: 0.22 };
  const darkText = { red: 0.05, green: 0.06, blue: 0.10 };
  const summaryBg = { red: 0.13, green: 0.16, blue: 0.24 };
  const summaryText = { red: 0.95, green: 0.80, blue: 0.30 };
  const borderStyle = { style: "SOLID", color: { red: 0.85, green: 0.85, blue: 0.85 } };

  await gwFetch(`/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        // Header row style (A1:Z1)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 26 },
            cell: {
              userEnteredFormat: {
                backgroundColor: goldBg,
                textFormat: { foregroundColor: darkText, bold: true, fontSize: 11, fontFamily: "Inter" },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
                padding: { top: 6, bottom: 6, left: 8, right: 8 },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,padding)",
          },
        },
        // Summary block style (AA1:AE1)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 26, endColumnIndex: 31 },
            cell: {
              userEnteredFormat: {
                backgroundColor: summaryBg,
                textFormat: { foregroundColor: summaryText, bold: true, fontSize: 11, fontFamily: "Inter" },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        // Number format for AMOUNT columns (G, I data rows)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 7 },
            cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0.00" }, horizontalAlignment: "RIGHT" } },
            fields: "userEnteredFormat(numberFormat,horizontalAlignment)",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 8, endColumnIndex: 9 },
            cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0.00" }, horizontalAlignment: "RIGHT" } },
            fields: "userEnteredFormat(numberFormat,horizontalAlignment)",
          },
        },
        // Format the total amount cell (AB1)
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 27, endColumnIndex: 28 },
            cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "€ #,##0.00" } } },
            fields: "userEnteredFormat.numberFormat",
          },
        },
        // Data row default style
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 26 },
            cell: {
              userEnteredFormat: {
                textFormat: { fontSize: 10, fontFamily: "Inter" },
                verticalAlignment: "MIDDLE",
                padding: { top: 4, bottom: 4, left: 6, right: 6 },
              },
            },
            fields: "userEnteredFormat(textFormat,verticalAlignment,padding)",
          },
        },
        // Freeze header row
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        // Auto resize columns A:AE
        {
          autoResizeDimensions: {
            dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 31 },
          },
        },
        // Row height for header
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "ROWS", startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 36 },
            fields: "pixelSize",
          },
        },
        // Banded rows for readability
        {
          addBanding: {
            bandedRange: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 26 },
              rowProperties: {
                firstBandColor: { red: 1, green: 1, blue: 1 },
                secondBandColor: { red: 0.97, green: 0.97, blue: 0.97 },
              },
            },
          },
        },
      ],
    }),
  }).catch((e) => console.warn("Formatting warning:", e.message)); // non-fatal (banding may already exist)
}

async function appendRow(tabName: string, row: (string | number)[]) {
  await gwFetch(
    `/spreadsheets/${SPREADSHEET_ID}/values/'${tabName}'!A:Z:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      body: JSON.stringify({ values: [row] }),
    },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let logId: string | null = null;
  try {
    const { user_id, deposit_id } = await req.json();
    if (!user_id || !deposit_id) {
      return new Response(JSON.stringify({ error: "user_id and deposit_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert pending log row
    const { data: logRow } = await supabase
      .from("sheets_ftd_log")
      .insert({ user_id, deposit_id, status: "pending" })
      .select("id").single();
    logId = logRow?.id ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, original_email, display_id, country, affiliate, funnel, created_at, ftd_agent, assigned_agent, shaved_from")
      .eq("id", user_id).single();
    if (!profile) throw new Error("Profile not found");

    const { data: deposit } = await supabase
      .from("deposits")
      .select("amount, currency, method, created_at, admin_notes")
      .eq("id", deposit_id).single();
    if (!deposit) throw new Error("Deposit not found");

    const conAgentId = (profile as any).ftd_agent || (profile as any).assigned_agent;
    const retAgentId = (profile as any).assigned_agent;
    const agentIds = [conAgentId, retAgentId].filter(Boolean);
    let agentMap: Record<string, string> = {};
    if (agentIds.length) {
      const { data: agents } = await supabase
        .from("profiles").select("id, full_name, email").in("id", agentIds);
      for (const a of agents || []) {
        agentMap[(a as any).id] = (a as any).full_name || (a as any).email || "";
      }
    }

    const depositDate = new Date(deposit.created_at);
    const tabName = monthTabName(depositDate);
    const amount = Number(deposit.amount) || 0;
    const currency = deposit.currency || "EUR";
    // EUR -> USD approximate; live rate not critical here
    const usdRate = currency.toUpperCase() === "EUR" ? 1.08 : 1;
    const amountUsd = Math.round(amount * usdRate * 100) / 100;

    // Extract PSP from admin_notes
    const pspMatch = deposit.admin_notes?.match(/\[PSP:\s*([^\]]+)\]/);
    const processor = pspMatch ? pspMatch[1].trim() : (deposit.method || "");

    const emailForRow = (profile as any).shaved_from
      ? ((profile as any).original_email || profile.email)
      : profile.email;

    const row = [
      "Crypto-Börse",              // BRAND
      fmtDate(deposit.created_at),        // DEPOSIT DATE
      fmtDate(profile.created_at),        // REG DATE
      String(profile.display_id ?? ""),   // CRM ID
      emailForRow || "",                  // EMAIL
      profile.full_name || "",            // NAME OF CLIENT
      amount,                             // AMOUNT
      currency,                           // CUR
      amountUsd,                          // AMOUNT $
      processor,                          // PROCESSOR
      conAgentId ? (agentMap[conAgentId] || "") : "", // CON AGENT
      profile.funnel || "",               // CAMPAIGN
      profile.affiliate || "",            // AFFILIATE
      profile.country || "",              // COUNTRY
      retAgentId ? (agentMap[retAgentId] || "") : "", // RET AGENT
      "Approved",                         // STATUS
      tabName,                            // APPROVED MONTH
      "",                                 // Fee to Aff
      "",                                 // NOTE $
      "",                                 // SETTLED
      "",                                 // SETTLE DATE
      "",                                 // BTC
      "",                                 // OR USD
      "",                                 // WALLET
      "",                                 // CHB/WD
      "",                                 // DATE WD
    ];

    await ensureMonthTab(tabName);
    await appendRow(tabName, row);

    if (logId) {
      await supabase.from("sheets_ftd_log")
        .update({ status: "sent", tab_name: tabName, sent_at: new Date().toISOString() })
        .eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, tab: tabName }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("sheets-log-ftd error:", err);
    const msg = err?.message || String(err);
    if (logId) {
      await supabase.from("sheets_ftd_log")
        .update({ status: "failed", error_message: msg.slice(0, 1000) })
        .eq("id", logId);
    }
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
