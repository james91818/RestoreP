import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { computeLivePnl, deriveClosePriceFromPnl } from "@/lib/tradePnl";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  TrendingUp, TrendingDown, Search, CandlestickChart, LineChart as LineChartIcon,
  ArrowUpRight, ArrowDownRight, Clock, X, ChevronDown, Bot, Send, Loader2,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import TradingViewTechnicalAnalysis from "@/components/tradingview/TradingViewTechnicalAnalysis";
import TradingViewSymbolInfo from "@/components/tradingview/TradingViewSymbolInfo";
import TradingViewChart from "@/components/tradingview/TradingViewChart";
import TablePagination from "@/components/admin/TablePagination";
import PlanLimitsCard from "@/components/PlanLimitsCard";
import TradingTermsGate from "@/components/client/TradingTermsGate";

// ─── Local crypto icon map ───
import btcIcon from "@/assets/crypto/btc.png";
import ethIcon from "@/assets/crypto/eth.png";
import solIcon from "@/assets/crypto/sol.png";
import xrpIcon from "@/assets/crypto/xrp.png";
import bnbIcon from "@/assets/crypto/bnb.png";
import dogeIcon from "@/assets/crypto/doge.png";
import adaIcon from "@/assets/crypto/ada.png";
import dotIcon from "@/assets/crypto/dot.png";
import linkIcon from "@/assets/crypto/link.png";
import avaxIcon from "@/assets/crypto/avax.png";

const cryptoIcons: Record<string, string> = {
  BTC: btcIcon, ETH: ethIcon, SOL: solIcon, XRP: xrpIcon, BNB: bnbIcon,
  DOGE: dogeIcon, ADA: adaIcon, DOT: dotIcon, LINK: linkIcon, AVAX: avaxIcon,
};

// Fallback CDN logos for crypto assets without a DB icon (CoinCap CDN)
const cryptoCdnIcons: Record<string, string> = {
  LTC: "https://assets.coincap.io/assets/icons/ltc@2x.png",
  MATIC: "https://assets.coincap.io/assets/icons/matic@2x.png",
  SHIB: "https://assets.coincap.io/assets/icons/shib@2x.png",
  UNI: "https://assets.coincap.io/assets/icons/uni@2x.png",
  NEAR: "https://assets.coincap.io/assets/icons/near@2x.png",
  ATOM: "https://assets.coincap.io/assets/icons/atom@2x.png",
  APT: "https://assets.coincap.io/assets/icons/apt@2x.png",
};

// Stock logos via financialmodelingprep image-stock CDN (free, no key, reliable)
const stockSymbols = [
  "AAPL","MSFT","GOOGL","AMZN","META","TSLA","NVDA","AMD","INTC","NFLX",
  "PYPL","SHOP","UBER","COIN","PLTR","SNOW","XYZ",
];
const stockIconUrl = (sym: string) => `https://financialmodelingprep.com/image-stock/${sym}.png`;

// Index logos via Twemoji flag PNGs (reliable jsdelivr CDN)
const TW = (code: string) => `https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/${code}.png`;
const indexIcons: Record<string, string> = {
  DAX40: TW("1f1e9-1f1ea"),     // 🇩🇪
  CAC40: TW("1f1eb-1f1f7"),     // 🇫🇷
  FTSE100: TW("1f1ec-1f1e7"),   // 🇬🇧
  NAS100: TW("1f1fa-1f1f8"),    // 🇺🇸
  NI225: TW("1f1ef-1f1f5"),     // 🇯🇵
  SPX500: TW("1f1fa-1f1f8"),    // 🇺🇸
  STOXX50: TW("1f1ea-1f1fa"),   // 🇪🇺
};

// Commodity logos (emoji-style PNGs from twemoji CDN for universal coverage)
const commodityIcons: Record<string, string> = {
  "XAU/EUR": "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f947.png", // gold medal
  "XAG/EUR": "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f948.png", // silver medal
  "XPT/EUR": "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f948.png",
  USOIL: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f6e2.png",
  WTI: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f6e2.png",
  NATGAS: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f525.png",
  COPPER: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f7e0.png",
  WHEAT: "https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f33e.png",
};

function getAssetIcon(symbol: string, iconUrl: string | null): string | null {
  const sym = symbol.replace(/\/.*$/, "").replace("EUR", "").replace("USD", "").replace("USDT", "");
  if (cryptoIcons[sym]) return cryptoIcons[sym];
  if (iconUrl) return iconUrl;
  if (cryptoCdnIcons[sym]) return cryptoCdnIcons[sym];
  if (indexIcons[symbol]) return indexIcons[symbol];
  if (commodityIcons[symbol]) return commodityIcons[symbol];
  if (stockSymbols.includes(symbol)) return stockIconUrl(symbol);
  return null;
}

// ─── Types ───
interface Asset {
  id: string; symbol: string; name: string; type: string;
  icon_url: string | null; leverage_max: number; enabled: boolean;
  market_hours_start: string | null; market_hours_end: string | null;
  market_days: number[] | null;
}
interface TradeOverride {
  id: string; trade_id: string; override_mode: string;
  target_value: number | null; is_active: boolean;
}
interface Trade {
  id: string; user_id: string; asset_id: string; direction: string;
  size: number; entry_price: number; current_price: number | null;
  leverage: number; pnl: number | null; status: string;
  order_type: string; stop_loss: number | null; take_profit: number | null;
  opened_at: string; closed_at: string | null;
  assets?: { symbol: string; name: string };
  trade_overrides?: TradeOverride | TradeOverride[] | null;
}
type ChatMsg = { role: "user" | "assistant"; content: string };

/** Extract the active override from a trade (handles both array and object shapes from Supabase join) */
function getActiveOverride(trade: Trade): TradeOverride | null {
  const ov = trade.trade_overrides;
  if (!ov) return null;
  const item = Array.isArray(ov) ? ov[0] : ov;
  return item?.is_active && item.override_mode !== "none" ? item : null;
}


// ─── Timeframes ───
type Timeframe = "1H" | "4H" | "1D" | "1W" | "1M";
const TIMEFRAME_CONFIG: Record<Timeframe, { count: number; intervalMs: number; label: string }> = {
  "1H": { count: 60, intervalMs: 60_000, label: "1H" },
  "4H": { count: 48, intervalMs: 5 * 60_000, label: "4H" },
  "1D": { count: 48, intervalMs: 30 * 60_000, label: "1D" },
  "1W": { count: 56, intervalMs: 3 * 3600_000, label: "1W" },
  "1M": { count: 60, intervalMs: 12 * 3600_000, label: "1M" },
};

// ─── Market hours check ───
function isMarketOpen(asset: Asset): boolean {
  if (asset.type === "crypto") return true; // Crypto is 24/7
  const now = new Date();
  const utcDay = now.getUTCDay();
  const marketDays = asset.market_days ?? [1, 2, 3, 4, 5];
  if (!marketDays.includes(utcDay)) return false;
  if (asset.market_hours_start && asset.market_hours_end) {
    const [sh, sm] = asset.market_hours_start.split(":").map(Number);
    const [eh, em] = asset.market_hours_end.split(":").map(Number);
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    if (utcMinutes < startMin || utcMinutes >= endMin) return false;
  }
  return true;
}

// ─── Candle generation ───
// Generates candles that END at basePrice (the real market price)
function generateCandles(count: number, basePrice: number, intervalMs = 3600000) {
  const candles: { time: string; o: number; h: number; l: number; c: number }[] = [];
  const now = Date.now();
  const volatility = intervalMs > 3600000 ? 0.008 : 0.005;

  // Build prices backwards from basePrice
  const prices: number[] = [basePrice];
  let p = basePrice;
  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * p * volatility;
    p = p - change; // go backwards
    prices.unshift(p);
  }

  // Now create candles from the price path (prices[i] -> prices[i+1])
  for (let i = 0; i < count; i++) {
    const open = prices[i];
    const close = prices[i + 1];
    const high = Math.max(open, close) + Math.random() * Math.abs(close) * 0.002;
    const low = Math.min(open, close) - Math.random() * Math.abs(close) * 0.002;
    candles.push({
      time: new Date(now - (count - i) * intervalMs).toISOString(),
      o: +open.toFixed(open < 1 ? 6 : 2),
      h: +high.toFixed(high < 1 ? 6 : 2),
      l: +low.toFixed(low < 1 ? 6 : 2),
      c: +close.toFixed(close < 1 ? 6 : 2),
    });
  }
  return candles;
}

// ─── Chart ───
function PriceChart({ candles, chartType }: { candles: ReturnType<typeof generateCandles>; chartType: "candle" | "line" }) {
  if (!candles.length) return null;
  const allHigh = Math.max(...candles.map(c => c.h));
  const allLow = Math.min(...candles.map(c => c.l));
  const range = allHigh - allLow || 1;
  const W = 960, H = 380, padTop = 24, padBot = 24, padLeft = 12, padRight = 80;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBot;
  const yScale = (v: number) => padTop + ((allHigh - v) / range) * chartH;
  const candleW = Math.max(2, chartW / candles.length - 1);

  // Price label formatting
  const fmtPrice = (p: number) => {
    if (p >= 10000) return p.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (p >= 100) return p.toFixed(1);
    if (p >= 1) return p.toFixed(2);
    return p.toFixed(4);
  };

  // Grid lines at 0%, 25%, 50%, 75%, 100%
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: padTop + f * chartH,
    price: allHigh - f * range,
  }));

  const renderGrid = () => gridLines.map((g, i) => (
    <g key={i}>
      <line x1={padLeft} y1={g.y} x2={padLeft + chartW} y2={g.y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="4 3" />
      <text x={W - 6} y={g.y + 4} fill="hsl(var(--muted-foreground))" fontSize="11" fontFamily="Inter, sans-serif" textAnchor="end">{fmtPrice(g.price)}</text>
    </g>
  ));

  // Current price line
  const lastPrice = candles[candles.length - 1].c;
  const lastY = yScale(lastPrice);
  const priceLineColor = candles[candles.length - 1].c >= candles[0].o ? "hsl(var(--success))" : "hsl(var(--destructive))";

  if (chartType === "line") {
    const pts = candles.map((c, i) => {
      const x = padLeft + i * (chartW / candles.length) + (chartW / candles.length) / 2;
      return `${x},${yScale(c.c)}`;
    }).join(" ");
    const firstX = padLeft + (chartW / candles.length) / 2;
    const lastX = padLeft + (candles.length - 1) * (chartW / candles.length) + (chartW / candles.length) / 2;
    const fillPts = `${firstX},${padTop + chartH} ${pts} ${lastX},${padTop + chartH}`;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {renderGrid()}
        <polygon points={fillPts} fill="hsl(var(--primary) / 0.06)" />
        <polyline points={pts} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" />
        {/* Current price dashed line */}
        <line x1={padLeft} y1={lastY} x2={padLeft + chartW} y2={lastY} stroke={priceLineColor} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
        <circle cx={lastX} cy={yScale(lastPrice)} r="4" fill="hsl(var(--primary))" />
        {/* Price tag */}
        <rect x={padLeft + chartW + 4} y={lastY - 10} width={padRight - 10} height={20} rx="4" fill={priceLineColor} />
        <text x={padLeft + chartW + padRight / 2} y={lastY + 4} fill="white" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">{fmtPrice(lastPrice)}</text>
      </svg>
    );
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {renderGrid()}
      {candles.map((c, i) => {
        const x = padLeft + i * (chartW / candles.length) + (chartW / candles.length) / 2;
        const bullish = c.c >= c.o;
        const color = bullish ? "hsl(var(--success))" : "hsl(var(--destructive))";
        const bodyTop = yScale(Math.max(c.o, c.c));
        const bodyBot = yScale(Math.min(c.o, c.c));
        return (
          <g key={i}>
            <line x1={x} y1={yScale(c.h)} x2={x} y2={yScale(c.l)} stroke={color} strokeWidth="1" />
            <rect x={x - candleW / 2} y={bodyTop} width={candleW} height={Math.max(1, bodyBot - bodyTop)}
              fill={color} rx="0.5" />
          </g>
        );
      })}
      {/* Current price dashed line + tag */}
      <line x1={padLeft} y1={lastY} x2={padLeft + chartW} y2={lastY} stroke={priceLineColor} strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
      <rect x={padLeft + chartW + 4} y={lastY - 10} width={padRight - 10} height={20} rx="4" fill={priceLineColor} />
      <text x={padLeft + chartW + padRight / 2} y={lastY + 4} fill="white" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">{fmtPrice(lastPrice)}</text>
    </svg>
  );
}

// ─── AI Chat stream helper with tool call support ───
const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-trading`;

interface ToolCall {
  id: string;
  function: { name: string; arguments: string };
}

interface StreamResult {
  content: string;
  toolCalls: ToolCall[];
}

async function streamAI(
  messages: ChatMsg[],
  context: any,
  aiTradingEnabled: boolean,
  onDelta: (text: string) => void,
  onDone: (result: StreamResult) => void,
) {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, context, ai_trading_enabled: aiTradingEnabled }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "AI service error" }));
    throw new Error(err.error || "AI service error");
  }

  if (!resp.body) throw new Error("No stream body");
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let fullContent = "";
  const toolCallsMap: Record<number, { id: string; name: string; args: string }> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") {
        const toolCalls = Object.values(toolCallsMap).map(tc => ({
          id: tc.id,
          function: { name: tc.name, arguments: tc.args },
        }));
        onDone({ content: fullContent, toolCalls });
        return;
      }
      try {
        const parsed = JSON.parse(json);
        const delta = parsed.choices?.[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          onDelta(delta.content);
        }
        // Collect tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCallsMap[idx]) {
              toolCallsMap[idx] = { id: tc.id || "", name: "", args: "" };
            }
            if (tc.id) toolCallsMap[idx].id = tc.id;
            if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
            if (tc.function?.arguments) toolCallsMap[idx].args += tc.function.arguments;
          }
        }
      } catch { /* partial */ }
    }
  }
  const toolCalls = Object.values(toolCallsMap).map(tc => ({
    id: tc.id,
    function: { name: tc.name, arguments: tc.args },
  }));
  onDone({ content: fullContent, toolCalls });
}

// ─── Fetch real prices helper ───
const PRICES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-prices`;

async function fetchLivePrices(symbols: string[]): Promise<Record<string, number>> {
  try {
    const resp = await fetch(PRICES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ symbols }),
    }).catch(() => null);
    if (!resp || !resp.ok) return {}; // silently ignore 503/network errors
    const data = await resp.json().catch(() => null) as { prices?: Record<string, number> } | null;
    return data?.prices ?? {};
  } catch {
    return {};
  }
}

// ─── Main component ───
const Trading = () => {
  const { user } = useAuth();
  const { t: tr } = useLanguage();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [closedTrades, setClosedTrades] = useState<Trade[]>([]);
  const PAGE_SIZE = 50;
  const [openPage, setOpenPage] = useState(1);
  const [closedPage, setClosedPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("crypto");
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [chartType, setChartType] = useState<"candle" | "line">("candle");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [candles, setCandles] = useState<ReturnType<typeof generateCandles>>([]);
  const [livePrice, setLivePrice] = useState(0);
  const [priceChange, setPriceChange] = useState(0);
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [orderSize, setOrderSize] = useState("");
  const leverage = 1;
  const [orderType, setOrderType] = useState("market");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [slMode, setSlMode] = useState<"price" | "pct">("price");
  const [tpMode, setTpMode] = useState<"price" | "pct">("price");
  const [placing, setPlacing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [limitDialog, setLimitDialog] = useState<{ open: boolean; tier: string; limit: number }>({ open: false, tier: "", limit: 0 });
  const [showAssetList, setShowAssetList] = useState(false);
  const [balance, setBalance] = useState(0);
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [realApiPrices, setRealApiPrices] = useState<Record<string, number>>({});
  const openTradeSnapshots = useMemo(() => Object.fromEntries(openTrades.map((trade) => {
    const symbol = trade.assets?.symbol ?? "";
    const override = getActiveOverride(trade);
    // Admin locked: either active override OR current_price manually set during manipulation
    const adminLocked = !!override || (trade.current_price != null && trade.pnl != null);
    const displayPrice = trade.current_price ? Number(trade.current_price) : (livePrices[symbol] || Number(trade.entry_price));
    const displayPnl = adminLocked
      ? Number(trade.pnl)
      : computeLivePnl(trade, trade.current_price ? Number(trade.current_price) : (livePrices[symbol] || undefined));

    return [trade.id, { displayPrice, displayPnl }];
  })), [openTrades, livePrices]);

  // Trading mode: "manual" or "ai"
  const [tradingMode, setTradingMode] = useState<"manual" | "ai">("manual");

  // AI chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTradingEnabled, setAiTradingEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("crypto-boerse-ai-trading-enabled") === "true";
  });
  useEffect(() => {
    try {
      localStorage.setItem("crypto-boerse-ai-trading-enabled", aiTradingEnabled ? "true" : "false");
    } catch {}
  }, [aiTradingEnabled]);

  // Fetch live prices periodically
  const refreshPrices = useCallback(async (assetList: Asset[]) => {
    if (!assetList.length) return {} as Record<string, number>;
    const symbols = assetList.map(a => a.symbol);
    const prices = await fetchLivePrices(symbols);
    if (Object.keys(prices).length > 0) {
      // Sanity-clamp: reject any tick that moves >5% from the previous known price
      // (protects against transient provider glitches that would create fake P&L).
      setRealApiPrices(prev => {
        const next = { ...prev };
        for (const [sym, p] of Object.entries(prices)) {
          const last = prev[sym];
          if (!last || !Number.isFinite(last) || last <= 0) { next[sym] = p; continue; }
          const change = Math.abs(p - last) / last;
          next[sym] = change > 0.05 ? last : p;
        }
        return next;
      });
      setLivePrices(prev => {
        const merged: Record<string, number> = { ...prev };
        for (const [sym, p] of Object.entries(prices)) {
          const last = prev[sym];
          if (last && Number.isFinite(last) && last > 0) {
            const change = Math.abs(p - last) / last;
            merged[sym] = change > 0.05 ? last : p;
          } else {
            merged[sym] = p;
          }
        }
        // Preserve admin-manipulated prices
        for (const t of openTrades) {
          const sym = t.assets?.symbol;
          if (sym && t.current_price != null && (getActiveOverride(t) || t.pnl != null)) {
            merged[sym] = Number(t.current_price);
          }
        }
        return merged;
      });
    }
    return prices;
  }, [openTrades]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [{ data: a }, { data: openT }, { data: closedT }, { data: wallet }] = await Promise.all([
      supabase.from("assets").select("*").eq("enabled", true).order("symbol"),
      supabase.from("trades").select("*, assets(symbol, name), trade_overrides(*)").eq("user_id", user.id).eq("status", "open").order("opened_at", { ascending: false }),
      supabase.from("trades").select("*, assets(symbol, name)").eq("user_id", user.id).eq("status", "closed").order("closed_at", { ascending: false }).limit(20),
      supabase.from("wallets").select("balance").eq("user_id", user.id).eq("currency", "EUR").maybeSingle(),
    ]);
    const assetList = (a ?? []) as Asset[];
    setAssets(assetList);
    setOpenTrades((openT ?? []) as Trade[]);
    setClosedTrades((closedT ?? []) as Trade[]);
    setBalance(Number(wallet?.balance ?? 0));
    setLoading(false);

    // Fetch real prices first so the selected asset never starts with fantasy fallback values
    const initialPrices = await refreshPrices(assetList);

    if (!selectedAsset && assetList.length > 0) {
      const btcAsset = assetList.find(a => a.symbol.toUpperCase().includes("BTC") && a.type === "crypto");
      selectAsset(btcAsset ?? assetList[0], initialPrices);
    }
  }, [user, selectedAsset]);

  useEffect(() => { fetchData(); }, [user]);

  // Realtime subscription for instant trade updates (admin manipulation)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('client-trades-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trades',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const updated = payload.new as any;
          if (updated.status === 'open') {
            // Update the specific trade in-place for instant P&L refresh
            setOpenTrades(prev => {
              const newTrades = prev.map(t => 
                t.id === updated.id 
                  ? { ...t, ...updated, assets: t.assets } 
                  : t
              );
              return newTrades;
            });
            // If admin is manipulating current_price, reflect it on the chart & price display
            if (updated.current_price != null) {
              const matchedTrade = openTrades.find(t => t.id === updated.id);
              const sym = matchedTrade?.assets?.symbol;
              if (sym) {
                const manipPrice = Number(updated.current_price);
                setLivePrices(lp => ({ ...lp, [sym]: manipPrice }));
                setLivePrice(prev => {
                  // Only update if this trade's asset is the currently viewed asset
                  if (selectedAsset?.symbol === sym) return manipPrice;
                  return prev;
                });
              }
            }
          } else if (updated.status === 'closed') {
            // Trade was closed (possibly by admin manipulation finishing)
            // Move from open to closed
            setOpenTrades(prev => prev.filter(t => t.id !== updated.id));
            // Re-fetch closed trades and balance
            const [{ data: closedT }, { data: wallet }] = await Promise.all([
              supabase.from("trades").select("*, assets(symbol, name)")
                .eq("user_id", user.id).eq("status", "closed")
                .order("closed_at", { ascending: false }).limit(20),
              supabase.from("wallets").select("balance")
                .eq("user_id", user.id).eq("currency", "EUR").maybeSingle(),
            ]);
            if (closedT) setClosedTrades(closedT as Trade[]);
            if (wallet) setBalance(Number(wallet.balance));
          }
        }
      )
      .subscribe();

    // Also poll every 15s as a fallback
    const interval = setInterval(async () => {
      const { data: openT } = await supabase
        .from("trades").select("*, assets(symbol, name), trade_overrides(*)")
        .eq("user_id", user.id).eq("status", "open")
        .order("opened_at", { ascending: false });
      if (openT) setOpenTrades(openT as Trade[]);
      const { data: wallet } = await supabase
        .from("wallets").select("balance")
        .eq("user_id", user.id).eq("currency", "EUR").maybeSingle();
      if (wallet) setBalance(Number(wallet.balance));
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user]);

  // Refresh prices every 3 seconds — single source of truth (fetch-prices edge function)
  useEffect(() => {
    if (!assets.length) return;
    const interval = setInterval(() => refreshPrices(assets), 3000);
    return () => clearInterval(interval);
  }, [assets, refreshPrices]);

  // Update live price when livePrices map changes and we have a selected asset
  // Only generate chart on first load; afterwards just update the last candle
  const chartInitialized = useRef(false);
  useEffect(() => {
    if (!selectedAsset || !livePrices[selectedAsset.symbol]) return;
    const realPrice = livePrices[selectedAsset.symbol];
    setLivePrice(realPrice);

    if (!chartInitialized.current || candles.length === 0) {
      // First time: generate full chart ending at the real price
      const tf = TIMEFRAME_CONFIG[timeframe];
      const data = generateCandles(tf.count, realPrice, tf.intervalMs);
      setCandles(data);
      setPriceChange(+((data[data.length - 1].c - data[0].o) / data[0].o * 100).toFixed(2));
      chartInitialized.current = true;
    } else {
      // Subsequent updates: smoothly update last candle to real price
      setCandles(prev => {
        if (!prev.length) return prev;
        const last = { ...prev[prev.length - 1] };
        last.c = realPrice;
        last.h = Math.max(last.h, realPrice);
        last.l = Math.min(last.l, realPrice);
        return [...prev.slice(0, -1), last];
      });
    }
  }, [livePrices, selectedAsset?.symbol]);

  // Smoothly interpolate the displayed price toward the real API price (no random ticks)
  useEffect(() => {
    if (!selectedAsset || !candles.length) return;
    const tickInterval = setInterval(() => {
      setCandles(prev => {
        if (!prev.length) return prev;
        const last = { ...prev[prev.length - 1] };
        // Determine target price: admin manipulation > real API price
        const manipulatedTrade = openTrades.find(t =>
          t.assets?.symbol === selectedAsset?.symbol && t.current_price != null && (getActiveOverride(t) || t.pnl != null)
        );
        const targetPrice = manipulatedTrade
          ? Number(manipulatedTrade.current_price)
          : (realApiPrices[selectedAsset?.symbol ?? ""] || last.c);
        if (!targetPrice || targetPrice <= 0) return prev;
        // Smooth interpolation: move 8% closer to target each 250ms tick (no randomness, no jumps)
        const newClose = +(last.c + (targetPrice - last.c) * 0.08).toFixed(last.c < 1 ? 6 : 2);
        if (newClose === last.c) return prev;
        last.c = newClose;
        last.h = Math.max(last.h, newClose);
        last.l = Math.min(last.l, newClose);
        setLivePrice(newClose);
        setPriceChange(+((newClose - prev[0].o) / prev[0].o * 100).toFixed(2));
        if (selectedAsset) {
          setLivePrices(lp => ({ ...lp, [selectedAsset.symbol]: newClose }));
        }
        return [...prev.slice(0, -1), last];
      });
    }, 250);

    // Shift candles (create new candle) at the timeframe interval, capped to every 10s for fast timeframes
    const tf = TIMEFRAME_CONFIG[timeframe];
    const shiftMs = Math.max(10_000, Math.min(tf.intervalMs, 60_000));
    const shiftInterval = setInterval(() => {
      setCandles(prev => {
        if (!prev.length) return prev;
        const lastClose = prev[prev.length - 1].c;
        const newCandle = {
          time: new Date().toISOString(),
          o: lastClose, h: lastClose, l: lastClose, c: lastClose,
        };
        return [...prev.slice(1), newCandle];
      });
    }, shiftMs);

    return () => { clearInterval(tickInterval); clearInterval(shiftInterval); };
  }, [selectedAsset?.id, timeframe, candles.length > 0]);

  // Auto-liquidation: when live loss >= margin (size), close trade at -size.
  // Prevents clients from waiting out underwater leveraged positions.
  const liquidatingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!openTrades.length) return;
    for (const trade of openTrades) {
      if (liquidatingRef.current.has(trade.id)) continue;
      // Skip admin-manipulated trades (override or stored pnl with locked price)
      const override = getActiveOverride(trade);
      const adminLocked = !!override || (trade.current_price != null && trade.pnl != null);
      if (adminLocked) continue;

      const symbol = trade.assets?.symbol ?? "";
      const livePx = livePrices[symbol];
      if (!livePx) continue;
      const lev = Number(trade.leverage) || 1;
      // SAFETY: At 1x leverage there is no margin call. A "total loss" would
      // require the asset price to actually reach ~0, which never happens on
      // real markets. A glitchy live tick must NEVER be allowed to wipe the
      // client's margin. Skip client-side liquidation entirely for 1x trades.
      if (lev <= 1) continue;
      const entry = Number(trade.entry_price) || 0;
      // Sanity check: reject obviously broken ticks (>50% deviation from entry)
      // before considering liquidation. A real intraday move of that size is
      // virtually impossible for the assets we offer.
      if (entry > 0 && Math.abs(livePx - entry) / entry > 0.5) continue;
      const livePnl = computeLivePnl(trade, livePx);
      const size = Number(trade.size);
      if (livePnl <= -size) {
        liquidatingRef.current.add(trade.id);
        (async () => {
          try {
            const liqPrice = deriveClosePriceFromPnl(trade, -size);
            const { data: updatedRows } = await supabase.from("trades").update({
              status: "closed",
              closed_at: new Date().toISOString(),
              pnl: -size,
              current_price: liqPrice,
            }).eq("id", trade.id).eq("status", "open").select("id");
            if (updatedRows && updatedRows.length > 0) {
              // Margin already deducted at trade open — liquidation = total loss of margin, no wallet credit.
              toast.error(tr(`Position liquidiert — ${symbol} Verlust: €${size.toFixed(2)}`, `Position liquidated — ${symbol} loss: €${size.toFixed(2)}`));
            }
            fetchData();
          } finally {
            liquidatingRef.current.delete(trade.id);
          }
        })();
      }
    }
  }, [openTrades, livePrices, tr, fetchData]);

  // Smoothly interpolate livePrices toward real API prices for all open-trade assets (no random ticks)
  useEffect(() => {
    if (!openTrades.length) return;
    const interval = setInterval(() => {
      setLivePrices(prev => {
        const next = { ...prev };
        let changed = false;
        for (const t of openTrades) {
          const sym = t.assets?.symbol;
          if (!sym) continue;
          const cur = next[sym];
          const target = realApiPrices[sym];
          if (!cur || !target || target <= 0) continue;
          const newPx = +(cur + (target - cur) * 0.08).toFixed(cur < 1 ? 6 : 2);
          if (newPx !== cur) {
            next[sym] = newPx;
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 250);
    return () => clearInterval(interval);
  }, [openTrades, realApiPrices]);

  const selectAsset = (asset: Asset, pricesMap?: Record<string, number>) => {
    chartInitialized.current = false; // Reset so chart regenerates for new asset
    setSelectedAsset(asset);
    setShowAssetList(false);
    const prices = pricesMap ?? livePrices;
    const realPrice = prices[asset.symbol];
    const base = realPrice || 0;
    if (!base) {
      setCandles([]);
      setLivePrice(0);
      setPriceChange(0);
      setOrderSize(""); setStopLoss(""); setTakeProfit(""); setSlMode("price"); setTpMode("price");
      return;
    }
    const tf = TIMEFRAME_CONFIG[timeframe];
    const data = generateCandles(tf.count, base, tf.intervalMs);
    setCandles(data);
    setLivePrice(base);
    setPriceChange(+((data[data.length - 1].c - data[0].o) / data[0].o * 100).toFixed(2));
    setOrderSize(""); setStopLoss(""); setTakeProfit(""); setSlMode("price"); setTpMode("price");
    chartInitialized.current = true;
  };

  const placeTrade = async () => {
    if (!user || !selectedAsset || !orderSize) return;
    if (!isMarketOpen(selectedAsset)) {
      toast.error(tr(`Der Markt für ${selectedAsset.symbol} ist derzeit geschlossen. Nur Krypto-Handel ist verfügbar.`, `The market for ${selectedAsset.symbol} is currently closed. Only crypto trading is available.`));
      return;
    }
    const sizeNum = Number(orderSize);
    if (isNaN(sizeNum) || sizeNum <= 0) { toast.error(tr("Bitte geben Sie einen gültigen Betrag ein", "Please enter a valid amount")); return; }
    if (sizeNum > balance) { toast.error(tr("Nicht genügend Guthaben", "Insufficient balance")); return; }
    setPlacing(true);
    const slPrice = stopLoss ? (slMode === "pct" ? +(livePrice * (1 - Number(stopLoss) / 100)).toFixed(2) : Number(stopLoss)) : null;
    const tpPrice = takeProfit ? (tpMode === "pct" ? +(livePrice * (1 + Number(takeProfit) / 100)).toFixed(2) : Number(takeProfit)) : null;
    const { data, error } = await supabase.functions.invoke("trade-action", {
      body: {
        action: "open",
        asset_id: selectedAsset.id,
        direction,
        size: sizeNum,
        leverage: 1,
        order_type: orderType,
        stop_loss: slPrice,
        take_profit: tpPrice,
      },
    });
    if (error || (data as any)?.error) {
      const errCode = (data as any)?.error_code;
      if (errCode === "trade_limit") {
        setLimitDialog({ open: true, tier: (data as any)?.tier ?? "", limit: Number((data as any)?.daily_limit ?? 0) });
      } else {
        toast.error((data as any)?.error || tr("Order konnte nicht platziert werden", "Order could not be placed"));
      }
    } else {
      toast.success(`${direction === "buy" ? tr("KAUF", "BUY") : tr("VERKAUF", "SELL")} ${selectedAsset.symbol} — €${sizeNum.toLocaleString()} ${tr("bei", "at")} 1×`);
      setOrderSize(""); setStopLoss(""); setTakeProfit(""); fetchData();
    }
    setPlacing(false);
  };

  const closeTrade = async (trade: Trade) => {
    const { data, error } = await supabase.functions.invoke("trade-action", {
      body: { action: "close", trade_id: trade.id },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || tr("Trade konnte nicht geschlossen werden", "Could not close trade"));
      return;
    }
    const pnl = Number((data as any)?.pnl ?? 0);
    toast.success(`Trade geschlossen — G&V: €${pnl.toFixed(2)}`);
    fetchData();
  };

  // Build AI context from current state
  const buildAIContext = useCallback(() => ({
    balance,
    selected_asset: selectedAsset?.symbol ?? null,
    current_price: livePrice,
    available_assets: assets.map(a => a.symbol),
    open_trades: openTrades.map(t => ({
      id: t.id,
      symbol: t.assets?.symbol ?? "?",
      direction: t.direction,
      size: t.size,
      entry_price: t.entry_price,
      pnl: openTradeSnapshots[t.id]?.displayPnl ?? 0,
    })),
  }), [balance, selectedAsset, livePrice, assets, openTrades, openTradeSnapshots]);

  // Execute AI tool calls
  const executeToolCall = async (toolCall: ToolCall): Promise<string> => {
    const { name, arguments: argsStr } = toolCall.function;
    try {
      const args = JSON.parse(argsStr);

      if (name === "open_trade") {
        const asset = assets.find(a => a.symbol.toUpperCase().includes(args.symbol.toUpperCase()));
        if (!asset) return JSON.stringify({ error: `Asset ${args.symbol} not found` });

        const size = Number(args.size);
        if (isNaN(size) || size <= 0) return JSON.stringify({ error: "Invalid trade size" });
        if (size > balance) return JSON.stringify({ error: `Insufficient balance. Available: €${balance.toFixed(2)}` });

        const lev = 1;
        const price = livePrices[asset.symbol] || livePrice;

        const slPrice = args.stop_loss_pct ? +(price * (1 - args.stop_loss_pct / 100)).toFixed(2) : null;
        const tpPrice = args.take_profit_pct ? +(price * (1 + args.take_profit_pct / 100)).toFixed(2) : null;

        const { data, error } = await supabase.functions.invoke("trade-action", {
          body: {
            action: "open",
            asset_id: asset.id,
            direction: args.direction === "sell" ? "sell" : "buy",
            size,
            leverage: 1,
            order_type: "market",
            stop_loss: slPrice,
            take_profit: tpPrice,
          },
        });

        if (error || (data as any)?.error) return JSON.stringify({ error: (data as any)?.error || error.message });

        toast.success(`${tr("KI hat", "AI opened")} ${args.direction === "buy" ? tr("KAUF", "BUY") : tr("VERKAUF", "SELL")} ${asset.symbol} — €${size}`);
        fetchData();
        return JSON.stringify({
          success: true,
          symbol: asset.symbol,
          direction: args.direction,
          size,
          entry_price: price,
          leverage: lev,
          stop_loss: slPrice,
          take_profit: tpPrice,
        });
      }

      if (name === "close_trade") {
        const trade = openTrades.find(t => t.id === args.trade_id);
        if (!trade) return JSON.stringify({ error: "Trade not found or already closed" });
        await closeTrade(trade);
        return JSON.stringify({ success: true, trade_id: args.trade_id, message: "Trade closed" });
      }

      if (name === "close_all_trades") {
        if (openTrades.length === 0) return JSON.stringify({ message: "No open trades to close" });
        for (const trade of openTrades) {
          await closeTrade(trade);
        }
        return JSON.stringify({ success: true, closed_count: openTrades.length });
      }

      return JSON.stringify({ error: `Unknown tool: ${name}` });
    } catch (e: any) {
      return JSON.stringify({ error: e.message || "Tool execution failed" });
    }
  };

  const sendAIMessage = async () => {
    if (!chatInput.trim() || aiLoading) return;
    const userMsg: ChatMsg = { role: "user", content: chatInput.trim() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput("");
    setAiLoading(true);

    let assistantContent = "";
    const upsert = (chunk: string) => {
      assistantContent += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: "assistant", content: assistantContent }];
      });
    };

    try {
      const context = buildAIContext();
      const result = await new Promise<StreamResult>((resolve, reject) => {
        streamAI(
          updatedMessages,
          context,
          aiTradingEnabled,
          upsert,
          (res) => resolve(res),
        ).catch(reject);
      });

      // If AI made tool calls, execute them and send results back
      if (result.toolCalls.length > 0) {
        const toolResults: string[] = [];
        for (const tc of result.toolCalls) {
          // Show action indicator
          const action = tc.function.name === "open_trade" ? "Opening trade..." : 
                        tc.function.name === "close_trade" ? "Closing trade..." : "Closing all trades...";
          upsert(`\n\n⚡ *${action}*\n`);
          
          const toolResult = await executeToolCall(tc);
          toolResults.push(toolResult);
        }

        // Send tool results back to AI for a summary response
        assistantContent = "";
        const messagesWithToolResult: ChatMsg[] = [
          ...updatedMessages,
          { role: "assistant", content: result.content || "Executing trade..." },
          { role: "user", content: `[Tool execution results: ${toolResults.join("; ")}] — Summarize what happened concisely.` },
        ];

        await new Promise<StreamResult>((resolve, reject) => {
          streamAI(
            messagesWithToolResult,
            buildAIContext(),
            false, // Don't allow tools in the summary response
            (chunk) => {
              assistantContent += chunk;
              setChatMessages(prev => {
                // Replace the last assistant message with the summary
                const newMsgs = [...prev];
                const lastIdx = newMsgs.length - 1;
                if (lastIdx >= 0 && newMsgs[lastIdx].role === "assistant") {
                  newMsgs[lastIdx] = { role: "assistant", content: assistantContent };
                }
                return newMsgs;
              });
            },
            (res) => resolve(res),
          ).catch(reject);
        });
      }

      setAiLoading(false);
    } catch (e: any) {
      toast.error(e.message || tr("KI-Fehler", "AI Error"));
      setAiLoading(false);
    }
  };

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const selectedMarketOpen = selectedAsset ? isMarketOpen(selectedAsset) : true;
  const exposure = orderSize ? Number(orderSize) * leverage : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const selectedIcon = selectedAsset ? getAssetIcon(selectedAsset.symbol, selectedAsset.icon_url) : null;

  return (
    <div className="space-y-3">
      <PlanLimitsCard compact />
      {/* ─── TOP: chart + order panel ─── */}
      <div className="flex flex-col lg:flex-row gap-3 lg:items-stretch">
        {/* Chart area */}
        <div className="flex-1 flex flex-col gap-2">
          {/* Asset header */}
          <Card>
            <CardContent className="p-3 sm:p-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                {/* Asset selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowAssetList(!showAssetList)}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors"
                  >
                    {selectedIcon ? (
                      <img src={selectedIcon} alt={selectedAsset?.symbol} className="h-8 w-8 rounded-full object-contain bg-primary/10" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {selectedAsset?.symbol.slice(0, 2)}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-display font-bold text-base leading-tight">{selectedAsset?.symbol}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{selectedAsset?.name}</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />
                  </button>

                  {/* Dropdown */}
                  {showAssetList && (
                    <Card className="absolute top-full left-0 mt-2 z-50 w-[calc(100vw-3rem)] sm:w-80 max-h-[420px] overflow-hidden shadow-2xl border">
                      <CardContent className="p-3 space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input placeholder={tr("Assets suchen...", "Search assets...")} value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-10" />
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {["all", "crypto", "stock", "commodity", "index"].map(t => {
                            const labels: Record<string, string> = { all: tr("Alle", "All"), crypto: tr("Krypto", "Crypto"), stock: tr("Aktien", "Stocks"), commodity: tr("Rohstoffe", "Commodities"), index: tr("Indizes", "Indices") };
                            return (
                            <button key={t} onClick={() => setTypeFilter(t)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${typeFilter === t ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                            >{labels[t] ?? t}</button>
                            );
                          })}
                        </div>
                        <div className="space-y-0.5 max-h-72 overflow-y-auto">
                          {filteredAssets.map(a => {
                            const icon = getAssetIcon(a.symbol, a.icon_url);
                            return (
                              <button key={a.id} onClick={() => selectAsset(a)}
                                className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left hover:bg-muted transition-colors ${selectedAsset?.id === a.id ? "bg-primary/5 border border-primary/20" : ""}`}
                              >
                                {icon ? (
                                  <img src={icon} alt={a.symbol} className="h-8 w-8 rounded-full object-contain bg-primary/10" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">{a.symbol.slice(0, 3)}</div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-semibold text-sm">{a.symbol}</p>
                                    {!isMarketOpen(a) && (
                                      <span className="text-[9px] px-1 py-0.5 rounded bg-destructive/10 text-destructive font-medium">Geschlossen</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{a.name}</p>
                                </div>
                                <div className="text-right shrink-0">
                                  {livePrices[a.symbol] ? (
                                    <p className="text-sm font-semibold">€{livePrices[a.symbol].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: livePrices[a.symbol] < 1 ? 4 : 2 })}</p>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] capitalize">{a.type}</Badge>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Price display */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-display font-bold leading-tight">
                      €{livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: livePrice < 1 ? 6 : livePrice < 100 ? 4 : 2 })}
                    </p>
                    {!selectedMarketOpen && (
                      <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                        <Clock className="h-3 w-3 mr-0.5" /> {tr("Geschlossen", "Closed")}
                      </Badge>
                    )}
                  </div>
                  <span className={`text-sm font-semibold flex items-center gap-0.5 ${priceChange >= 0 ? "text-success" : "text-destructive"}`}>
                    {priceChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {priceChange >= 0 ? "+" : ""}{priceChange}%
                  </span>
                </div>
              </div>

              {/* Chart controls are handled inside the TradingView widget itself */}
            </CardContent>
          </Card>

          {/* Chart - TradingView Advanced Chart */}
          <Card>
            <CardContent className="p-0">
              <div className="h-[500px] md:h-[600px] bg-card">
                {selectedAsset ? (
                  <TradingViewChart symbol={selectedAsset.symbol} autosize />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Chart wird geladen …
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Symbol Info + Technical Analysis */}
          {selectedAsset && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Card>
                <CardContent className="p-0">
                  <TradingViewSymbolInfo
                    symbol={selectedAsset.symbol}
                    name={selectedAsset.name}
                    type={selectedAsset.type}
                    iconUrl={selectedIcon}
                    currentPrice={livePrice}
                    priceChange={priceChange}
                    marketOpen={selectedMarketOpen}
                    leverageMax={selectedAsset.leverage_max}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-0">
                  <TradingViewTechnicalAnalysis
                    symbol={selectedAsset.symbol}
                    candles={candles}
                    timeframe={timeframe}
                    currentPrice={livePrice}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ─── RIGHT PANEL: Manual / AI toggle ─── */}
        <div className="w-full lg:w-[340px] shrink-0 flex flex-col gap-2">
          {/* Mode switcher */}
          <div className="grid grid-cols-2 gap-0 bg-muted rounded-xl p-1">
            <button
              onClick={() => setTradingMode("manual")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tradingMode === "manual"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TrendingUp className="h-4 w-4" /> {tr("Manuell handeln", "Manual Trade")}
            </button>
            <button
              onClick={() => setTradingMode("ai")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tradingMode === "ai"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Bot className="h-4 w-4" /> {tr("KI-Assistent", "AI Assistant")}
            </button>
          </div>

          {tradingMode === "manual" ? (
            /* ─── MANUAL ORDER FORM ─── */
            <Card className="flex-1 flex flex-col overflow-y-auto">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display">{tr("Order aufgeben", "Place Order")}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {tr("Verfügbar", "Available")}: <span className="font-semibold text-foreground">€{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Market closed warning */}
                {!selectedMarketOpen && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>{tr(`Der Markt für ${selectedAsset?.symbol} ist geschlossen. Wechseln Sie zu einem Krypto-Asset, um jetzt zu handeln.`, `The market for ${selectedAsset?.symbol} is closed. Switch to a crypto asset to trade now.`)}</span>
                  </div>
                )}
                {/* Direction */}
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={direction === "buy" ? "default" : "outline"} onClick={() => setDirection("buy")}
                    className={`h-11 text-base font-bold ${direction === "buy" ? "bg-success hover:bg-success/90 text-success-foreground" : ""}`}>
                    <ArrowUpRight className="h-5 w-5 mr-1.5" /> {tr("Kaufen", "Buy")}
                  </Button>
                  <Button variant={direction === "sell" ? "destructive" : "outline"} onClick={() => setDirection("sell")}
                    className="h-11 text-base font-bold">
                    <ArrowDownRight className="h-5 w-5 mr-1.5" /> {tr("Verkaufen", "Sell")}
                  </Button>
                </div>

                {/* Order type */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{tr("Ordertyp", "Order Type")}</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market">{tr("Marktorder", "Market Order")}</SelectItem>
                      <SelectItem value="limit">{tr("Limitorder", "Limit Order")}</SelectItem>
                      <SelectItem value="stop">{tr("Stoporder", "Stop Order")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{tr("Betrag (€)", "Amount (€)")}</Label>
                  <Input type="number" value={orderSize} onChange={e => setOrderSize(e.target.value)}
                    placeholder={tr("Betrag eingeben", "Enter amount")} className="h-10 text-base" />
                  {Number(orderSize) > 0 && livePrice > 0 && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {(Number(orderSize) / livePrice).toFixed(livePrice > 100 ? 6 : 4)} {selectedAsset?.symbol ?? ""}
                    </p>
                  )}
                  <div className="grid grid-cols-4 gap-1.5">
                    {[25, 50, 75, 100].map(pct => (
                      <button key={pct} onClick={() => setOrderSize(String(Math.floor(balance * pct / 100)))}
                        className="text-xs font-semibold py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground transition-colors"
                      >{pct}%</button>
                    ))}
                  </div>
                </div>

                 {/* Leverage */}
                 <div className="space-y-1.5">
                   <div className="flex items-center justify-between">
                     <Label className="text-xs font-medium">{tr("Hebel", "Leverage")}</Label>
                     <Badge variant="outline" className="text-xs font-bold">1×</Badge>
                   </div>
                   <div className="rounded-lg bg-muted px-3 py-2 text-xs font-medium text-muted-foreground">
                     {tr("Für diesen Handel ist nur 1× Hebel verfügbar.", "Only 1× leverage is available for this trading flow.")}
                   </div>
                 </div>

                {/* SL / TP */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-destructive font-medium">Stop Loss</Label>
                      <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
                        <button onClick={() => { setSlMode("price"); setStopLoss(""); }} className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${slMode === "price" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>€</button>
                        <button onClick={() => { setSlMode("pct"); setStopLoss(""); }} className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${slMode === "pct" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>%</button>
                      </div>
                    </div>
                    <Input type="number" value={stopLoss} onChange={e => setStopLoss(e.target.value)} placeholder={slMode === "pct" ? tr("z.B. 5", "e.g. 5") : tr("Optional", "Optional")} className="h-10" />
                    {slMode === "pct" && stopLoss && livePrice > 0 && (
                      <p className="text-[10px] text-muted-foreground">= €{(livePrice * (1 - Number(stopLoss) / 100)).toFixed(2)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-success font-medium">Take Profit</Label>
                      <div className="flex gap-0.5 bg-muted rounded-md p-0.5">
                        <button onClick={() => { setTpMode("price"); setTakeProfit(""); }} className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${tpMode === "price" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>€</button>
                        <button onClick={() => { setTpMode("pct"); setTakeProfit(""); }} className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${tpMode === "pct" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>%</button>
                      </div>
                    </div>
                    <Input type="number" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} placeholder={tpMode === "pct" ? tr("z.B. 10", "e.g. 10") : tr("Optional", "Optional")} className="h-10" />
                    {tpMode === "pct" && takeProfit && livePrice > 0 && (
                      <p className="text-[10px] text-muted-foreground">= €{(livePrice * (1 + Number(takeProfit) / 100)).toFixed(2)}</p>
                    )}
                  </div>
                </div>

                {/* Summary */}
                {exposure > 0 && (
                  <div className="bg-muted/60 rounded-xl p-3.5 space-y-1.5">
                     <div className="flex justify-between text-xs">
                       <span className="text-muted-foreground">{tr("Einsatz", "Stake")}</span>
                       <span className="font-semibold">€{Number(orderSize).toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{tr("Gesamtexposure", "Total Exposure")}</span>
                        <span className="font-semibold">€{exposure.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{tr("Einstiegspreis", "Entry Price")}</span>
                       <span className="font-semibold">€{livePrice.toFixed(2)}</span>
                     </div>
                  </div>
                )}

                {/* Submit */}
                 <Button
                  className={`w-full h-12 text-base font-bold rounded-xl ${direction === "buy" ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}`}
                  onClick={() => setConfirmOpen(true)} disabled={placing || !orderSize || !selectedMarketOpen}
                >
                  {!selectedMarketOpen ? tr("Markt geschlossen", "Market Closed") : placing ? tr("Order wird platziert...", "Placing order...") : `${direction === "buy" ? tr("Kaufen", "Buy") : tr("Verkaufen", "Sell")} ${selectedAsset?.symbol ?? ""}`}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* ─── AI ASSISTANT PANEL ─── */
            <Card className="flex flex-col" style={{ height: "calc(100%  - 52px)" }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-display flex items-center gap-2">
                   <Bot className="h-5 w-5 text-primary" /> {tr("Crypto-Börse KI-Assistent", "Crypto-Börse AI Assistant")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{tr("Fragen Sie nach Handelssignalen, Analysen oder Markteinblicken", "Ask about trading signals, analysis, or market insights")}</p>
                {/* AI Trading toggle */}
                <div className="flex items-center justify-between mt-2 p-2.5 rounded-lg bg-muted/60">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${aiTradingEnabled ? "bg-success animate-pulse" : "bg-muted-foreground"}`} />
                    <span className="text-xs font-medium">{tr("KI-Handel erlauben", "Enable AI Trading")}</span>
                  </div>
                  <button
                    onClick={() => setAiTradingEnabled(!aiTradingEnabled)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${aiTradingEnabled ? "bg-success" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background transition-transform shadow-sm ${aiTradingEnabled ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                {aiTradingEnabled && (
                   <p className="text-[10px] text-success mt-1">✓ {tr("KI kann in Ihrem Namen Trades eröffnen & schließen", "AI can open & close trades on your behalf")}</p>
                 )}
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-3 pt-0 min-h-0">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-3 min-h-[280px] max-h-[420px]">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                      <Bot className="h-10 w-10 mb-3 opacity-30" />
                       <p className="text-sm font-medium">{tr("KI-Handelsassistent", "AI Trading Assistant")}</p>
                       <p className="text-xs mt-1 max-w-[220px]">
                         {aiTradingEnabled 
                           ? tr("Ich kann Märkte analysieren UND Trades für Sie ausführen. Versuchen Sie: \"Kaufe €500 BTC\"", "I can analyze markets AND execute trades for you. Try: \"Buy €500 BTC\"")
                           : tr("Fragen Sie mich nach Analysen, Handelsvorschlägen oder Markttrends", "Ask me about analysis, trade suggestions, or market trends")}
                       </p>
                       <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                         {(aiTradingEnabled 
                           ? [tr("Kaufe €500 BTC", "Buy €500 BTC"), tr("Analysiere ETH", "Analyze ETH"), tr("Alle Trades schließen", "Close all trades")]
                           : [tr("BTC analysieren", "Analyze BTC"), tr("Beste Krypto zum Kaufen?", "Best crypto to buy?"), tr("Marktaussichten", "Market outlook")]
                         ).map(q => (
                           <button key={q} onClick={() => { setChatInput(q); }}
                             className="px-3 py-1.5 rounded-full bg-muted text-xs font-medium hover:bg-muted/70 transition-colors"
                           >{q}</button>
                         ))}
                       </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  {aiLoading && chatMessages[chatMessages.length - 1]?.role !== "assistant" && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && sendAIMessage()}
                    placeholder={tr("Fragen Sie die KI um Handelsrat...", "Ask the AI for trading advice...")}
                    className="h-10 flex-1"
                    disabled={aiLoading}
                  />
                  <Button size="icon" onClick={sendAIMessage} disabled={aiLoading || !chatInput.trim()} className="h-10 w-10 shrink-0">
                    {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── OPEN POSITIONS ─── */}
      <div>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          {tr("Offene Positionen", "Open Positions")} {openTrades.length > 0 && <Badge variant="secondary" className="text-[10px] px-1.5">{openTrades.length}</Badge>}
        </h3>
        <Card>
          <CardContent className="p-0">
            {openTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Clock className="h-10 w-10 mb-3 opacity-30" />
                 <p className="text-base font-medium">{tr("Keine offenen Positionen", "No open positions")}</p>
                 <p className="text-sm mt-1">{tr("Wählen Sie ein Asset und platzieren Sie Ihren ersten Trade", "Select an asset and place your first trade")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                       {[tr("Asset", "Asset"), tr("Richtung", "Direction"), tr("Größe", "Size"), tr("Einstieg", "Entry"), tr("Aktuell", "Current"), tr("Hebel", "Leverage"), tr("G&V", "P&L"), ""].map(h => (
                         <th key={h} className={`p-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider ${h === "" ? "text-right" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {openTrades.slice((openPage - 1) * PAGE_SIZE, openPage * PAGE_SIZE).map(t => {
                      const symbol = t.assets?.symbol;
                      // If admin has locked P&L (override active or current_price manually set), use stored values
                      const adminLocked = !!getActiveOverride(t) || (t.current_price != null && t.pnl != null);
                      const priceForPnl = t.current_price ? Number(t.current_price) : (livePrices[symbol ?? ""] || undefined);
                      const pnl = adminLocked ? Number(t.pnl ?? 0) : computeLivePnl(t, priceForPnl);
                      const displayPrice = t.current_price ? Number(t.current_price) : (livePrices[symbol ?? ""] || Number(t.entry_price));
                      const tradeIcon = t.assets ? getAssetIcon(t.assets.symbol, null) : null;
                      return (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              {tradeIcon ? (
                                <img src={tradeIcon} alt="" className="h-6 w-6 rounded-full object-contain bg-primary/10" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold">
                                  {t.assets?.symbol?.slice(0, 2)}
                                </div>
                              )}
                              <span className="font-semibold">{t.assets?.symbol}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                             <Badge className={`capitalize text-xs ${t.direction === "buy" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                               {t.direction === "buy" ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                               {t.direction === "buy" ? tr("Kauf", "Buy") : tr("Verkauf", "Sell")}
                             </Badge>
                          </td>
                          <td className="p-3.5 font-medium">€{Number(t.size).toLocaleString()}</td>
                          <td className="p-3.5 text-muted-foreground">€{Number(t.entry_price).toFixed(2)}</td>
                          <td className="p-3.5">€{displayPrice.toFixed(2)}</td>
                          <td className="p-3.5">{t.leverage}×</td>
                          <td className={`p-3.5 font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs h-8 px-3"
                               onClick={() => closeTrade(t)}>
                               <X className="h-3.5 w-3.5 mr-1" /> {tr("Schließen", "Close")}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination
              page={openPage}
              totalItems={openTrades.length}
              pageSize={PAGE_SIZE}
              onPageChange={setOpenPage}
              previousLabel={tr("Zurück", "Previous")}
              nextLabel={tr("Weiter", "Next")}
              countLabel={(from, to, total) => tr(`${from}–${to} von ${total} Positionen`, `${from}–${to} of ${total} positions`)}
            />
          </CardContent>
        </Card>
      </div>

      {/* ─── TRADE HISTORY ─── */}
      <div>
        <h3 className="text-sm font-semibold mb-2">{tr("Handelsverlauf", "Trade History")}</h3>
        <Card>
          <CardContent className="p-0">
            {closedTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                 <Clock className="h-10 w-10 mb-3 opacity-30" />
                 <p className="text-base font-medium">{tr("Noch kein Handelsverlauf", "No trade history yet")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                       {[tr("Asset", "Asset"), tr("Richtung", "Direction"), tr("Größe", "Size"), tr("Einstieg", "Entry"), tr("Hebel", "Leverage"), tr("G&V", "P&L"), tr("Geschlossen", "Closed")].map(h => (
                         <th key={h} className="p-3.5 font-medium text-muted-foreground text-xs uppercase tracking-wider text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.slice((closedPage - 1) * PAGE_SIZE, closedPage * PAGE_SIZE).map(t => {
                      const pnl = Number(t.pnl ?? 0);
                      const tradeIcon = t.assets ? getAssetIcon(t.assets.symbol, null) : null;
                      return (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-2.5">
                              {tradeIcon ? (
                                <img src={tradeIcon} alt="" className="h-6 w-6 rounded-full object-contain bg-primary/10" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[9px] font-bold">
                                  {t.assets?.symbol?.slice(0, 2)}
                                </div>
                              )}
                              <span className="font-semibold">{t.assets?.symbol}</span>
                            </div>
                          </td>
                          <td className="p-3.5">
                             <Badge className={`capitalize text-xs ${t.direction === "buy" ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                               {t.direction === "buy" ? tr("Kauf", "Buy") : tr("Verkauf", "Sell")}
                             </Badge>
                          </td>
                          <td className="p-3.5 font-medium">€{Number(t.size).toLocaleString()}</td>
                          <td className="p-3.5 text-muted-foreground">€{Number(t.entry_price).toFixed(2)}</td>
                          <td className="p-3.5">{t.leverage}×</td>
                          <td className={`p-3.5 font-bold ${pnl >= 0 ? "text-success" : "text-destructive"}`}>
                            {pnl >= 0 ? "+" : ""}€{pnl.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-muted-foreground text-xs">
                            {t.closed_at ? new Date(t.closed_at).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination
              page={closedPage}
              totalItems={closedTrades.length}
              pageSize={PAGE_SIZE}
              onPageChange={setClosedPage}
              previousLabel={tr("Zurück", "Previous")}
              nextLabel={tr("Weiter", "Next")}
              countLabel={(from, to, total) => tr(`${from}–${to} von ${total} Trades`, `${from}–${to} of ${total} trades`)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Trade Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
             <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {tr(`${direction === "buy" ? "Kauf" : "Verkauf"}-Order bestätigen`, `Confirm ${direction === "buy" ? "Buy" : "Sell"} Order`)}
               </DialogTitle>
             </DialogHeader>
           <div className="space-y-3 text-sm">
             <div className="flex justify-between"><span className="text-muted-foreground">Asset</span><span className="font-medium">{selectedAsset?.symbol}</span></div>
             <div className="flex justify-between"><span className="text-muted-foreground">{tr("Richtung", "Direction")}</span><span className={`font-medium ${direction === "buy" ? "text-success" : "text-destructive"}`}>{direction === "buy" ? tr("KAUF", "BUY") : tr("VERKAUF", "SELL")}</span></div>
             <div className="flex justify-between"><span className="text-muted-foreground">{tr("Größe", "Size")}</span><span className="font-medium">€{Number(orderSize).toLocaleString()}</span></div>
             <div className="flex justify-between"><span className="text-muted-foreground">{tr("Einstiegspreis", "Entry Price")}</span><span className="font-medium">{livePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
             <div className="flex justify-between"><span className="text-muted-foreground">{tr("Hebel", "Leverage")}</span><span className="font-medium">{leverage}×</span></div>
             {stopLoss && <div className="flex justify-between"><span className="text-muted-foreground">Stop Loss</span><span className="font-medium">{slMode === "pct" ? `${stopLoss}%` : stopLoss}</span></div>}
             {takeProfit && <div className="flex justify-between"><span className="text-muted-foreground">Take Profit</span><span className="font-medium">{tpMode === "pct" ? `${takeProfit}%` : takeProfit}</span></div>}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>{tr("Gesamtexposure", "Total Exposure")}</span>
                <span>€{(Number(orderSize) * leverage).toLocaleString()}</span>
             </div>
           </div>
           <DialogFooter className="gap-2">
             <Button variant="outline" onClick={() => setConfirmOpen(false)}>{tr("Abbrechen", "Cancel")}</Button>
             <Button
               className={direction === "buy" ? "bg-success hover:bg-success/90 text-success-foreground" : "bg-destructive hover:bg-destructive/90 text-destructive-foreground"}
               onClick={() => { setConfirmOpen(false); placeTrade(); }}
               disabled={placing}
             >
               {placing ? tr("Wird platziert...", "Placing...") : tr(`${direction === "buy" ? "Kauf" : "Verkauf"} bestätigen`, `Confirm ${direction === "buy" ? "Buy" : "Sell"}`)}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily trade limit reached — upgrade prompt */}
      <Dialog open={limitDialog.open} onOpenChange={(o) => setLimitDialog((s) => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("Tageslimit erreicht", "Daily limit reached")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>
              {tr(
                `Ihr ${limitDialog.tier}-Plan erlaubt ${limitDialog.limit} Trades pro Tag. Sie haben dieses Limit für heute erreicht.`,
                `Your ${limitDialog.tier} plan allows ${limitDialog.limit} trades per day. You've reached today's limit.`
              )}
            </p>
            <p className="text-muted-foreground">
              {tr(
                "Upgraden Sie Ihren Plan, um mehr Trades pro Tag platzieren zu können.",
                "Upgrade your plan to place more trades per day."
              )}
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLimitDialog((s) => ({ ...s, open: false }))}>
              {tr("Schließen", "Close")}
            </Button>
            <Button
              className="bg-primary text-primary-foreground"
              onClick={() => { setLimitDialog((s) => ({ ...s, open: false })); window.location.href = "/account-types"; }}
            >
              {tr("Plan upgraden", "Upgrade plan")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TradingPage = () => {
  const { user } = useAuth();
  return (
    <TradingTermsGate userId={user?.id}>
      <Trading />
    </TradingTermsGate>
  );
};

export default TradingPage;
