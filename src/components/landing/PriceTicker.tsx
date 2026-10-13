import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  iconUrl: string;
  type: "crypto";
}

const CRYPTO_SYMBOLS = [
  "BTC", "ETH", "XRP", "BNB", "SOL",
  "DOGE", "ADA", "DOT", "LINK", "AVAX",
  "LTC", "SUI", "ATOM", "NEAR", "UNI",
  "MATIC", "SHIB", "TRX", "TON", "XLM",
  "HBAR", "FIL", "APT", "ARB", "OP",
];

const CRYPTO_META: Record<string, { name: string; iconUrl: string }> = {
  BTC: { name: "Bitcoin", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/btc.png" },
  ETH: { name: "Ethereum", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/eth.png" },
  XRP: { name: "XRP", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/xrp.png" },
  BNB: { name: "BNB", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/bnb.png" },
  SOL: { name: "Solana", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/sol.png" },
  DOGE: { name: "Dogecoin", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/doge.png" },
  ADA: { name: "Cardano", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/ada.png" },
  DOT: { name: "Polkadot", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/dot.png" },
  LINK: { name: "Chainlink", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/link.png" },
  AVAX: { name: "Avalanche", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/avax.png" },
  LTC: { name: "Litecoin", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/ltc.png" },
  SUI: { name: "Sui", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/sui.png" },
  ATOM: { name: "Cosmos", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/atom.png" },
  NEAR: { name: "NEAR", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/near.png" },
  UNI: { name: "Uniswap", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/uni.png" },
  MATIC: { name: "Polygon", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/matic.png" },
  SHIB: { name: "Shiba Inu", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/shib.png" },
  TRX: { name: "TRON", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/trx.png" },
  TON: { name: "Toncoin", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/ton.png" },
  XLM: { name: "Stellar", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/xlm.png" },
  HBAR: { name: "Hedera", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/hbar.png" },
  FIL: { name: "Filecoin", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/fil.png" },
  APT: { name: "Aptos", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/apt.png" },
  ARB: { name: "Arbitrum", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/arb.png" },
  OP: { name: "Optimism", iconUrl: "https://cdn.jsdelivr.net/gh/nicklimmm/cryptoicons@master/icons/op.png" },
};

// Binance-symbol overrides for coins that don't trade as `<SYM>USDT` on Binance
const BINANCE_OVERRIDE: Record<string, string> = {
  MATIC: "POLUSDT", // Polygon rebranded to POL
};
const binanceSymbol = (sym: string) => BINANCE_OVERRIDE[sym] ?? `${sym}USDT`;

const formatPrice = (price?: number | null) => {
  const safePrice = Number(price);
  if (!Number.isFinite(safePrice)) return "\u2014";
  if (safePrice >= 1000) return `\u20AC${safePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (safePrice >= 1) return `\u20AC${safePrice.toFixed(2)}`;
  return `\u20AC${safePrice.toFixed(4)}`;
};

const formatChange = (change?: number | null) => {
  const safeChange = Number(change);
  return Number.isFinite(safeChange) ? safeChange.toFixed(2) : "0.00";
};

const PriceTicker = () => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const symbols = CRYPTO_SYMBOLS.map(binanceSymbol);
        const [tickerRes, eurRes] = await Promise.all([
          fetch(
            `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`,
          ).catch(() => null),
          fetch("https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT").catch(() => null),
        ]);
        if (!tickerRes || !tickerRes.ok) return;
        const tickers = (await tickerRes.json().catch(() => null)) as
          | { symbol: string; lastPrice: string; priceChangePercent: string }[]
          | null;
        if (!Array.isArray(tickers)) return;
        const eurJson = eurRes && eurRes.ok ? await eurRes.json().catch(() => null) : null;
        const eurUsd = eurJson?.price ? parseFloat(eurJson.price) : 1.08;

        const byBinanceSymbol = new Map<string, { lastPrice: string; priceChangePercent: string }>();
        tickers.forEach((t) => byBinanceSymbol.set(t.symbol, t));

        const next: TickerItem[] = [];
        for (const sym of CRYPTO_SYMBOLS) {
          const t = byBinanceSymbol.get(binanceSymbol(sym));
          if (!t) continue;
          const usdt = parseFloat(t.lastPrice);
          if (!Number.isFinite(usdt) || eurUsd <= 0) continue;
          const priceEur = usdt / eurUsd;
          const meta = CRYPTO_META[sym];
          next.push({
            symbol: sym,
            name: meta?.name ?? sym,
            price: priceEur,
            change24h: parseFloat(t.priceChangePercent),
            iconUrl: meta?.iconUrl ?? "",
            type: "crypto",
          });
        }
        if (next.length > 0) setItems(next);
      } catch {
        // Keep fallback
      }
    };

    fetchPrices();
    const interval = setInterval(() => {
      if (!document.hidden) fetchPrices();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <div className="w-full overflow-hidden bg-[hsl(var(--l-bg-deep))] backdrop-blur-sm border-y border-[#3b82f6]/10 py-3">
      <div className="flex gap-10 whitespace-nowrap animate-ticker hover:[animation-play-state:paused]">
        {doubled.map((item, i) => {
          const safeChange = Number(item.change24h);
          const isPositive = Number.isFinite(safeChange) ? safeChange >= 0 : true;
          return (
            <div key={`${item.symbol}-${i}`} className="flex items-center gap-2.5 shrink-0">
              <img
                src={item.iconUrl}
                alt={item.name}
                className="h-5 w-5 rounded-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="font-semibold text-[hsl(var(--l-fg))] text-sm">{item.symbol}</span>
              <span className="text-[hsl(var(--l-fg-low))] text-sm">{formatPrice(item.price)}</span>
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isPositive ? "+" : ""}
                {formatChange(item.change24h)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriceTicker;
