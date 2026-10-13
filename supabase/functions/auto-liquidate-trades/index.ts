// Server-side auto-liquidation: closes any open trade where live loss >= margin (size).
// Runs on a schedule so liquidation works even when the client browser is closed.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function computePnl(t: any, px: number): number {
  const entry = Number(t.entry_price);
  const size = Number(t.size);
  const lev = Number(t.leverage);
  if (!entry || !size || !lev || !px) return 0;
  const change = (px - entry) / entry;
  return t.direction === "buy" ? change * size * lev : -change * size * lev;
}

function deriveClosePrice(t: any, pnl: number): number {
  const entry = Number(t.entry_price);
  const size = Number(t.size);
  const lev = Number(t.leverage);
  if (!entry || !size || !lev) return entry;
  const ratio = pnl / (size * lev);
  const signed = t.direction === "buy" ? ratio : -ratio;
  return entry * (1 + signed);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const liquidated: any[] = [];
  const skipped: any[] = [];

  try {
    // Fetch all open trades with their asset symbol
    const { data: trades, error } = await supabase
      .from("trades")
      .select("id, user_id, entry_price, size, leverage, direction, current_price, pnl, asset_id, assets:asset_id(symbol), trade_overrides(id, target_value, is_active, finish_at)")
      .eq("status", "open");

    if (error) throw error;
    if (!trades || trades.length === 0) {
      return new Response(JSON.stringify({ ok: true, checked: 0, liquidated: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect distinct symbols
    const symbols = Array.from(new Set(trades.map((t: any) => t.assets?.symbol).filter(Boolean)));

    // Get live prices via fetch-prices function
    const priceResp = await fetch(`${SUPABASE_URL}/functions/v1/fetch-prices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify({ symbols }),
    });
    const priceData = await priceResp.json().catch(() => ({ prices: {} }));
    const prices: Record<string, number> = priceData?.prices ?? {};

    const now = Date.now();

    for (const t of trades as any[]) {
      const sym = t.assets?.symbol;
      const px = sym ? prices[sym] : undefined;
      if (!px) { skipped.push({ id: t.id, reason: "no price" }); continue; }

      // Skip admin-locked trades: any active override OR stored pnl + locked current_price
      const overrides = Array.isArray(t.trade_overrides) ? t.trade_overrides : (t.trade_overrides ? [t.trade_overrides] : []);
      const hasActiveOverride = overrides.some((o: any) => o?.is_active && (!o.finish_at || new Date(o.finish_at).getTime() > now));
      const adminStored = t.current_price !== null && t.pnl !== null && t.pnl !== undefined;
      if (hasActiveOverride || adminStored) {
        skipped.push({ id: t.id, reason: "admin locked" });
        continue;
      }

      const size = Number(t.size);
      const livePnl = computePnl(t, px);

      if (livePnl <= -size) {
        const liqPrice = deriveClosePrice(t, -size);
        const { data: updated, error: upErr } = await supabase
          .from("trades")
          .update({
            status: "closed",
            closed_at: new Date().toISOString(),
            pnl: -size,
            current_price: liqPrice,
          })
          .eq("id", t.id)
          .eq("status", "open")
          .select("id");
        if (upErr) {
          skipped.push({ id: t.id, reason: `update error: ${upErr.message}` });
        } else if (updated && updated.length > 0) {
          liquidated.push({ id: t.id, user_id: t.user_id, symbol: sym, loss: -size, price: liqPrice });
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, checked: trades.length, liquidated, skipped_count: skipped.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-liquidate-trades error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e), liquidated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
