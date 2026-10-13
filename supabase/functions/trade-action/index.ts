// Server-side trade execution. Single source of truth for opening/closing trades.
// Prevents client-side price/PnL manipulation by:
//   1. Fetching the live price server-side at execution time
//   2. Computing PnL from authoritative entry/close prices
//   3. Atomically updating the wallet inside the same call
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function computePnl(direction: string, entry: number, close: number, size: number, leverage: number): number {
  if (!entry || !close || !size || !leverage) return 0;
  const change = (close - entry) / entry;
  const raw = direction === "buy" ? change * size * leverage : -change * size * leverage;
  return +raw.toFixed(2);
}

// Anti-scalping spread: simulates real bid/ask. Buys execute slightly above mid, sells slightly below.
// 0.05% per side = 0.10% round trip. With 50x leverage that's a guaranteed -5% on margin per trade,
// making 1-second momentum scalping mathematically unprofitable.
const SPREAD_BPS = 5; // 0.05% = 5 basis points each side
function applySpread(midPrice: number, side: "open_buy" | "open_sell" | "close_buy" | "close_sell"): number {
  const adj = SPREAD_BPS / 10000;
  // Opening a buy or closing a sell = pay the ask (higher).
  // Opening a sell or closing a buy = receive the bid (lower).
  if (side === "open_buy" || side === "close_sell") return +(midPrice * (1 + adj)).toFixed(8);
  return +(midPrice * (1 - adj)).toFixed(8);
}

// Minimum hold time scales with leverage to prevent micro-scalping at high leverage.
function minHoldSeconds(leverage: number): number {
  if (leverage >= 50) return 60;
  if (leverage >= 20) return 30;
  if (leverage >= 10) return 15;
  return 5;
}

async function fetchServerPriceOnce(symbol: string): Promise<number | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/fetch-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ symbols: [symbol] }),
    });
    const data = await resp.json().catch(() => ({}));
    const px = Number(data?.prices?.[symbol]);
    return Number.isFinite(px) && px > 0 ? px : null;
  } catch {
    return null;
  }
}

/**
 * Reliable server-side price fetch with anti-glitch protection.
 *  - Samples the price twice (with a small delay) and compares.
 *  - If samples disagree by >1.5%, takes a third sample and returns the median
 *    of the three, which discards a single transient bad tick.
 *  - When `referencePrice` is provided (e.g. trade entry_price for short holds),
 *    rejects any sample that deviates more than `maxDeviation` (default 5%)
 *    from the reference and falls back to the closer one.
 */
async function fetchServerPrice(
  symbol: string,
  referencePrice?: number,
  maxDeviation = 0.05,
): Promise<number | null> {
  const a = await fetchServerPriceOnce(symbol);
  if (!a) return null;
  // small delay to let provider settle
  await new Promise((r) => setTimeout(r, 250));
  const b = await fetchServerPriceOnce(symbol);
  let candidates = [a, b].filter((v): v is number => Number.isFinite(v) && v > 0);
  if (candidates.length === 2 && Math.abs(a - b) / Math.min(a, b) > 0.015) {
    // disagreement: pull a third sample and pick the median
    await new Promise((r) => setTimeout(r, 250));
    const c = await fetchServerPriceOnce(symbol);
    if (c) candidates.push(c);
    candidates.sort((x, y) => x - y);
    const median = candidates[Math.floor(candidates.length / 2)];
    // optional reference clamp
    if (referencePrice && referencePrice > 0) {
      const dev = Math.abs(median - referencePrice) / referencePrice;
      if (dev > maxDeviation) {
        // pick the candidate closest to reference
        const closest = candidates.reduce((best, v) =>
          Math.abs(v - referencePrice) < Math.abs(best - referencePrice) ? v : best, candidates[0]);
        const closestDev = Math.abs(closest - referencePrice) / referencePrice;
        return closestDev > maxDeviation ? null : closest;
      }
    }
    return median;
  }
  // samples agree — average them
  const avg = candidates.reduce((s, v) => s + v, 0) / candidates.length;
  if (referencePrice && referencePrice > 0) {
    const dev = Math.abs(avg - referencePrice) / referencePrice;
    if (dev > maxDeviation) return null;
  }
  return avg;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const action = String(payload?.action ?? "");

  // ─── Plan / daily-limits config ───
  // Order matches TIER_ORDER on the client. Aliases map legacy/translated names.
  const TIER_ORDER = [
    "Basic",
    "Starter Plan",
    "Diversifikation",
    "Erweiterter Plan",
    "Professional",
    "Legacy Wealth Strategie",
    "Millionaire Club",
  ] as const;
  type Tier = typeof TIER_ORDER[number];
  const TIER_MINS: Record<Tier, number> = {
    "Basic": 250,
    "Starter Plan": 10000,
    "Diversifikation": 25000,
    "Erweiterter Plan": 50000,
    "Professional": 100000,
    "Legacy Wealth Strategie": 200000,
    "Millionaire Club": 1000000,
  };
  const PLAN_ALIASES: Record<string, Tier> = {
    "Starter": "Starter Plan",
    "Erweitert": "Erweiterter Plan",
    "Legacy Wealth": "Legacy Wealth Strategie",
    "Legacy": "Legacy Wealth Strategie",
    "Millionaire": "Millionaire Club",
  };
  // Daily trade limits per tier — fetched from tier_trade_limits table (admin-editable).
  // Hardcoded fallback used only if the row is missing.
  const DAILY_TRADE_LIMITS_FALLBACK: Record<Tier, number | null> = {
    "Basic": 3,
    "Starter Plan": 1,
    "Diversifikation": 1,
    "Erweiterter Plan": 1,
    "Professional": 1,
    "Legacy Wealth Strategie": 1,
    "Millionaire Club": 1,
  };
  async function getDailyTradeLimit(tier: Tier): Promise<number | null> {
    const { data } = await admin
      .from("tier_trade_limits")
      .select("daily_trade_limit")
      .eq("tier", tier)
      .maybeSingle();
    if (data && data.daily_trade_limit !== undefined) {
      return data.daily_trade_limit as number | null;
    }
    return DAILY_TRADE_LIMITS_FALLBACK[tier];
  }
  function normalizeTier(v: string | null | undefined): Tier {
    if (!v) return "Basic";
    if ((TIER_ORDER as readonly string[]).includes(v)) return v as Tier;
    return PLAN_ALIASES[v] ?? "Basic";
  }
  async function resolveEffectiveTier(): Promise<Tier> {
    const { data: profile } = await admin
      .from("profiles").select("account_type").eq("id", userId).maybeSingle();
    const stored = normalizeTier((profile as any)?.account_type);
    const { data: w } = await admin
      .from("wallets").select("balance").eq("user_id", userId).eq("currency", "EUR").maybeSingle();
    const bal = Number((w as any)?.balance ?? 0);
    let byBalance: Tier = "Basic";
    for (const t of TIER_ORDER) if (bal >= TIER_MINS[t]) byBalance = t;
    return TIER_ORDER.indexOf(byBalance) > TIER_ORDER.indexOf(stored) ? byBalance : stored;
  }

  // ─── OPEN TRADE ───
  if (action === "open") {
    const assetId = String(payload?.asset_id ?? "");
    const direction = payload?.direction === "sell" ? "sell" : "buy";
    const size = Number(payload?.size);
    const requestedLeverage = Math.max(1, Math.min(100, Math.floor(Number(payload?.leverage) || 1)));
    const leverage = 1;
    const orderType = String(payload?.order_type ?? "market");
    const stopLoss = payload?.stop_loss != null ? Number(payload.stop_loss) : null;
    const takeProfit = payload?.take_profit != null ? Number(payload.take_profit) : null;

    if (!assetId) return json({ error: "asset_id required" }, 400);
    if (!Number.isFinite(size) || size <= 0) return json({ error: "Invalid size" }, 400);
    if (size > 1_000_000) return json({ error: "Size exceeds maximum" }, 400);

    // Fetch asset
    const { data: asset } = await admin
      .from("assets").select("id, symbol, enabled, leverage_max")
      .eq("id", assetId).maybeSingle();
    if (!asset || !asset.enabled) return json({ error: "Asset not available" }, 400);
    if (requestedLeverage > 1) return json({ error: "Maximum leverage for this trading flow is 1x" }, 400);
    if (leverage > asset.leverage_max) return json({ error: `Max leverage for ${asset.symbol} is ${asset.leverage_max}` }, 400);

    // ── Daily trade limit per plan ──
    const tier = await resolveEffectiveTier();
    const dailyLimit = await getDailyTradeLimit(tier);
    if (dailyLimit !== null) {
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      const { count: todayCount } = await admin
        .from("trades")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("opened_at", since.toISOString());
      if ((todayCount ?? 0) >= dailyLimit) {
        return json({
          error: `Tageslimit erreicht: ${dailyLimit} Trades pro Tag im ${tier}-Plan. Upgraden Sie Ihren Plan für mehr Trades.`,
          error_code: "trade_limit",
          tier,
          daily_limit: dailyLimit,
        }, 429);
      }
    }

    // SERVER-SIDE PRICE (apply spread so opening costs slightly worse than mid)
    const midPrice = await fetchServerPrice(asset.symbol);
    if (!midPrice) return json({ error: "Live price unavailable, try again" }, 503);
    const livePrice = applySpread(midPrice, direction === "buy" ? "open_buy" : "open_sell");

    const { data: atomicResult, error: openErr } = await admin.rpc("open_trade_atomic", {
      p_user_id: userId,
      p_asset_id: assetId,
      p_direction: direction,
      p_size: size,
      p_entry_price: livePrice,
      p_leverage: leverage,
      p_order_type: orderType,
      p_stop_loss: stopLoss,
      p_take_profit: takeProfit,
    });

    if (openErr) {
      const message = openErr.message?.toLowerCase() ?? "";
      if (message.includes("insufficient balance")) return json({ error: "Insufficient balance" }, 400);
      if (message.includes("wallet not found")) return json({ error: "Wallet not found" }, 400);
      console.error("open_trade_atomic failed", { userId, assetId, size, openErr });
      return json({ error: "Trade could not be opened safely, no funds were deducted" }, 500);
    }

    const row = Array.isArray(atomicResult) ? atomicResult[0] : atomicResult;
    if (!row?.trade_id) {
      console.error("open_trade_atomic returned no trade_id", { userId, assetId, size, atomicResult });
      return json({ error: "Trade could not be confirmed, no funds were deducted" }, 500);
    }

    return json({ ok: true, trade_id: row.trade_id, entry_price: row.entry_price ?? livePrice });
  }

  // ─── CLOSE TRADE ───
  if (action === "close") {
    const tradeId = String(payload?.trade_id ?? "");
    if (!tradeId) return json({ error: "trade_id required" }, 400);

    const { data: trade } = await admin
      .from("trades")
      .select("id, user_id, asset_id, direction, size, entry_price, leverage, status, pnl, current_price, opened_at, assets:asset_id(symbol), trade_overrides(id, target_value, is_active, finish_at)")
      .eq("id", tradeId).maybeSingle();
    if (!trade) return json({ error: "Trade not found" }, 404);
    if (trade.user_id !== userId) return json({ error: "Forbidden" }, 403);
    if (trade.status !== "open") return json({ error: "Trade not open" }, 400);

    const size = Number(trade.size);
    const entry = Number(trade.entry_price);
    const lev = Number(trade.leverage);
    const symbol = (trade as any).assets?.symbol;

    // Determine final price + PnL with priority: admin override > admin-stored > server live
    const overrides: any[] = Array.isArray(trade.trade_overrides) ? trade.trade_overrides : (trade.trade_overrides ? [trade.trade_overrides] : []);
    const now = Date.now();
    const activeOverride = overrides.find((o) => o?.is_active && (!o.finish_at || new Date(o.finish_at).getTime() > now));

    let finalPnl: number;
    let finalPrice: number;

    if (activeOverride && activeOverride.target_value != null) {
      finalPnl = +Number(activeOverride.target_value).toFixed(2);
      const ratio = finalPnl / (size * lev);
      const signed = trade.direction === "buy" ? ratio : -ratio;
      finalPrice = +(entry * (1 + signed)).toFixed(2);
    } else if (trade.current_price != null && trade.pnl != null && Number(trade.pnl) !== 0) {
      finalPnl = +Number(trade.pnl).toFixed(2);
      finalPrice = Number(trade.current_price);
    } else {
      // Anti-scalping: enforce minimum hold time scaled by leverage
      const openedMs = trade.opened_at ? new Date(trade.opened_at).getTime() : now;
      const heldSec = (now - openedMs) / 1000;
      const minHold = minHoldSeconds(lev);
      if (heldSec < minHold) {
        const wait = Math.ceil(minHold - heldSec);
        return json({ error: `Minimum hold time for ${lev}x leverage is ${minHold}s. Please wait ${wait}s.` }, 429);
      }

      const midPrice = symbol ? await fetchServerPrice(symbol, entry, 0.05) : null;
      if (!midPrice) return json({ error: "Live price unstable, please try again in a moment" }, 503);
      // Apply spread: closing a buy = sell at bid (lower); closing a sell = buy at ask (higher)
      finalPrice = applySpread(midPrice, trade.direction === "buy" ? "close_buy" : "close_sell");
      finalPnl = computePnl(trade.direction, entry, finalPrice, size, lev);
      // Cap loss at -size (auto-liquidation)
      if (finalPnl < -size) finalPnl = -size;
    }

    // Atomic close
    const { data: updated, error: upErr } = await admin
      .from("trades")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        pnl: finalPnl,
        current_price: finalPrice,
      })
      .eq("id", tradeId).eq("status", "open")
      .select("id");
    if (upErr) return json({ error: upErr.message }, 500);
    if (!updated || updated.length === 0) {
      return json({ ok: true, already_closed: true });
    }

    // Credit wallet: return margin + pnl (loss subtracts)
    const { data: wallet } = await admin
      .from("wallets").select("id, balance")
      .eq("user_id", userId).eq("currency", "EUR").maybeSingle();
    if (wallet) {
      const newBal = Number(wallet.balance) + size + finalPnl;
      await admin.from("wallets").update({ balance: newBal, updated_at: new Date().toISOString() }).eq("id", wallet.id);
    }

    return json({ ok: true, pnl: finalPnl, close_price: finalPrice });
  }

  return json({ error: "Unknown action" }, 400);
});
