// Copy Trading Engine — fires automatic trades for every active copy subscription.
// Triggered by pg_cron every minute. Each subscription has its own randomized cadence
// (next_trade_at) so followers don't all fire at once.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cadence per subscription (randomized between ticks)
const MIN_GAP_MIN = 90;
const MAX_GAP_MIN = 360;
const AVG_TRADES_PER_MONTH = Math.round((24 * 60) / ((MIN_GAP_MIN + MAX_GAP_MIN) / 2) * 30);
const WIN_RATE = 0.88;
const SIZE_FRACTION_MIN = 0.06;
const SIZE_FRACTION_MAX = 0.18;
const LEVERAGE_OPTIONS = [5, 10, 20, 25, 50];

// Monthly yield ranges per project tier — fallback when tier_trade_limits has no override
const TIER_YIELD_FALLBACK: Record<string, { min: number; max: number }> = {
  "Basic":                    { min: 0.08, max: 0.10 },
  "Starter Plan":             { min: 0.10, max: 0.12 },
  "Diversifikation":          { min: 0.11, max: 0.14 },
  "Erweiterter Plan":         { min: 0.12, max: 0.15 },
  "Professional":             { min: 0.14, max: 0.18 },
  "Legacy Wealth Strategie":  { min: 0.16, max: 0.22 },
  "Family Office":            { min: 0.17, max: 0.23 },
  "Millionaire Club":         { min: 0.18, max: 0.25 },
};
const TIER_ALIASES: Record<string, string> = {
  "Starter": "Starter Plan",
  "Erweitert": "Erweiterter Plan",
  "Legacy Wealth": "Legacy Wealth Strategie",
  "Legacy": "Legacy Wealth Strategie",
  "Millionaire": "Millionaire Club",
};
const normalizeTier = (v?: string | null) => {
  if (!v) return "Basic";
  if (TIER_YIELD_FALLBACK[v]) return v;
  return TIER_ALIASES[v] ?? "Basic";
};

function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randomGapMs() { return Math.floor(rand(MIN_GAP_MIN, MAX_GAP_MIN) * 60 * 1000); }
function nextScheduledAt() { return new Date(Date.now() + randomGapMs()).toISOString(); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const nowIso = new Date().toISOString();

    const { data: subs, error: subsErr } = await supabase
      .from("copy_subscriptions")
      .select("id, user_id, trader_id, invested_capital, last_trade_at, next_trade_at, copy_traders(display_name, win_rate, total_pnl, total_trades, allowed_asset_types, allowed_symbols)")
      .eq("is_active", true)
      .gt("invested_capital", 0)
      .or(`next_trade_at.is.null,next_trade_at.lte.${nowIso}`);

    if (subsErr) throw subsErr;
    if (!subs || subs.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: assets } = await supabase
      .from("assets").select("id, symbol, type").eq("enabled", true);
    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, reason: "no assets" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: prices } = await supabase.from("price_cache").select("symbol, price");
    const priceMap = new Map<string, number>();
    (prices ?? []).forEach((p: any) => priceMap.set(p.symbol, Number(p.price)));

    let processed = 0;
    let scheduled = 0;
    let totalPnl = 0;

    for (const sub of subs as any[]) {
      // Resolve tier + per-tier daily copy-trade cap + per-tier monthly yield
      const { data: profile } = await supabase
        .from("profiles").select("account_type").eq("id", sub.user_id).maybeSingle();
      const tier = normalizeTier((profile as any)?.account_type);
      const { data: tl } = await supabase
        .from("tier_trade_limits")
        .select("daily_copy_trade_limit, yield_min_pct, yield_max_pct")
        .eq("tier", tier)
        .maybeSingle();
      const dailyLimit = (tl as any)?.daily_copy_trade_limit ?? null;
      const fallback = TIER_YIELD_FALLBACK[tier] ?? TIER_YIELD_FALLBACK["Basic"];
      // tier_trade_limits stores percentages (8 = 8%) — convert to fraction
      const yieldMinPct = (tl as any)?.yield_min_pct != null
        ? Number((tl as any).yield_min_pct) / 100
        : fallback.min;
      const yieldMaxPct = (tl as any)?.yield_max_pct != null
        ? Number((tl as any).yield_max_pct) / 100
        : fallback.max;

      if (dailyLimit !== null) {
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);
        const { count: todayCount } = await supabase
          .from("copied_trades")
          .select("id", { count: "exact", head: true })
          .eq("user_id", sub.user_id)
          .gte("created_at", startOfDay.toISOString());
        if ((todayCount ?? 0) >= Number(dailyLimit)) {
          const tomorrow = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 + Math.floor(rand(1, 60) * 60 * 1000));
          await supabase.from("copy_subscriptions")
            .update({ next_trade_at: tomorrow.toISOString() }).eq("id", sub.id);
          scheduled++;
          continue;
        }
      }

      // First-ever tick should execute on the next cron run, not wait 15-90 minutes.
      // That initial delay made new subscriptions look broken in both client and backoffice.

      const trader0 = sub.copy_traders ?? {};
      const allowedTypes: string[] = Array.isArray(trader0.allowed_asset_types) && trader0.allowed_asset_types.length > 0
        ? trader0.allowed_asset_types
        : ["crypto", "stock", "index", "commodity"];
      const allowedSymbols: string[] = Array.isArray(trader0.allowed_symbols) ? trader0.allowed_symbols : [];
      let pool = assets.filter((a: any) => allowedTypes.includes(a.type));
      if (allowedSymbols.length > 0) {
        pool = pool.filter((a: any) => allowedSymbols.includes(a.symbol));
      }
      if (pool.length === 0) {
        await supabase.from("copy_subscriptions")
          .update({ next_trade_at: nextScheduledAt() }).eq("id", sub.id);
        scheduled++;
        continue;
      }
      const asset = pick(pool);
      const entry = priceMap.get(asset.symbol) || rand(50, 50000);
      const direction = Math.random() > 0.5 ? "buy" : "sell";
      const leverage = pick(LEVERAGE_OPTIONS);
      const sizeFrac = rand(SIZE_FRACTION_MIN, SIZE_FRACTION_MAX);
      let size = +(Number(sub.invested_capital) * sizeFrac).toFixed(2);
      if (size < 5) {
        await supabase.from("copy_subscriptions")
          .update({ next_trade_at: nextScheduledAt() }).eq("id", sub.id);
        scheduled++;
        continue;
      }

      // Back-solve per-trade target so monthly total ≈ yieldPct × invested_capital
      const yieldPct = rand(yieldMinPct, yieldMaxPct);
      const tradesPerMonth = dailyLimit && Number(dailyLimit) > 0
        ? Number(dailyLimit) * 30
        : AVG_TRADES_PER_MONTH;
      const targetNetPerTrade = (yieldPct * Number(sub.invested_capital)) / tradesPerMonth;
      const baseMagnitude = targetNetPerTrade / 0.76;
      const isWin = Math.random() < WIN_RATE;
      const noise = rand(0.6, 1.5);
      let pnl = +(((isWin ? 1 : -1) * baseMagnitude * noise)).toFixed(2);

      // Keep implied price move sane
      const notional = size * leverage;
      const impliedMove = notional > 0 ? Math.abs(pnl) / notional : 1;
      if (impliedMove > 0.06) {
        size = +(Math.abs(pnl) / (0.05 * leverage)).toFixed(2);
      }

      const priceShiftMag = Math.abs(pnl) / (size * leverage);
      const priceShift = (pnl >= 0 ? 1 : -1) * priceShiftMag * (direction === "buy" ? 1 : -1);
      const close = +(entry * (1 + priceShift)).toFixed(8);

      const openDurationMin = rand(15, 240);
      const openedAt = new Date(Date.now() - Math.floor(openDurationMin * 60 * 1000)).toISOString();
      const closedAt = new Date().toISOString();

      const { data: trade, error: tradeErr } = await supabase.from("trades").insert({
        user_id: sub.user_id,
        asset_id: asset.id,
        direction,
        size,
        leverage,
        entry_price: entry,
        current_price: close,
        pnl,
        status: "closed",
        opened_at: openedAt,
        closed_at: closedAt,
      }).select("id").maybeSingle();

      if (tradeErr || !trade) {
        console.error("trade insert failed", tradeErr);
        continue;
      }

      await supabase.from("copied_trades").insert({
        user_id: sub.user_id,
        subscription_id: sub.id,
        trade_id: trade.id,
        status: "executed",
      });

      // Credit P&L to EUR wallet (size stays in subscription's invested_capital, only pnl flows to wallet)
      const { data: wallet } = await supabase
        .from("wallets").select("id, balance")
        .eq("user_id", sub.user_id).eq("currency", "EUR").maybeSingle();
      if (wallet) {
        const newBal = Number((wallet as any).balance) + pnl;
        await supabase.from("wallets")
          .update({ balance: newBal, updated_at: new Date().toISOString() })
          .eq("id", (wallet as any).id);
      }

      // Bump trader stats
      const trader = sub.copy_traders;
      if (trader) {
        const newTotalTrades = (trader.total_trades ?? 0) + 1;
        const newPnl = Number(trader.total_pnl ?? 0) + pnl;
        const oldWr = Number(trader.win_rate ?? 70);
        const newWr = +((oldWr * 0.95) + ((isWin ? 100 : 0) * 0.05)).toFixed(2);
        await supabase.from("copy_traders").update({
          total_trades: newTotalTrades,
          total_pnl: +newPnl.toFixed(2),
          win_rate: newWr,
        }).eq("id", sub.trader_id);
      }

      await supabase.from("copy_subscriptions")
        .update({ last_trade_at: new Date().toISOString(), next_trade_at: nextScheduledAt() })
        .eq("id", sub.id);

      processed++;
      totalPnl += pnl;
    }

    return new Response(JSON.stringify({ ok: true, processed, scheduled, totalPnl: +totalPnl.toFixed(2) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("copy-trading-engine error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
