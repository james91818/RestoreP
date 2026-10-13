import { useEffect, useState } from "react";
import { fetchCryptoPricesEur } from "@/lib/fetchCryptoPrices";
import btcIcon from "@/assets/crypto/btc.png";
import ethIcon from "@/assets/crypto/eth.png";
import solIcon from "@/assets/crypto/sol.png";
import bnbIcon from "@/assets/crypto/bnb.png";
import xrpIcon from "@/assets/crypto/xrp.png";
import adaIcon from "@/assets/crypto/ada.png";
import dogeIcon from "@/assets/crypto/doge.png";
import avaxIcon from "@/assets/crypto/avax.png";
import dotIcon from "@/assets/crypto/dot.png";
import linkIcon from "@/assets/crypto/link.png";

interface CoinPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
  isEmoji?: boolean;
}

const FALLBACK_PRICES: CoinPrice[] = [
  { symbol: "BTC", name: "Bitcoin", price: 73797, change24h: 0.15, icon: btcIcon },
  { symbol: "ETH", name: "Ethereum", price: 2309.7, change24h: 1.02, icon: ethIcon },
  { symbol: "SOL", name: "Solana", price: 93.68, change24h: -0.28, icon: solIcon },
  { symbol: "BNB", name: "BNB", price: 612.4, change24h: 0.87, icon: bnbIcon },
  { symbol: "XRP", name: "Ripple", price: 0.6218, change24h: -1.12, icon: xrpIcon },
  { symbol: "ADA", name: "Cardano", price: 0.4521, change24h: 2.34, icon: adaIcon },
  { symbol: "DOGE", name: "Dogecoin", price: 0.1234, change24h: -0.45, icon: dogeIcon },
  { symbol: "AVAX", name: "Avalanche", price: 35.82, change24h: 1.67, icon: avaxIcon },
  { symbol: "DOT", name: "Polkadot", price: 7.12, change24h: -0.93, icon: dotIcon },
  { symbol: "LINK", name: "Chainlink", price: 14.52, change24h: 0.74, icon: linkIcon },
  { symbol: "LTC", name: "Litecoin", price: 84.50, change24h: 1.32, icon: "Ł", isEmoji: true },
  { symbol: "ATOM", name: "Cosmos", price: 9.12, change24h: -0.67, icon: "⚛", isEmoji: true },
  { symbol: "NEAR", name: "NEAR", price: 5.48, change24h: 2.15, icon: "Ⓝ", isEmoji: true },
  { symbol: "APT", name: "Aptos", price: 8.92, change24h: -1.45, icon: "◈", isEmoji: true },
  { symbol: "SUI", name: "Sui", price: 1.28, change24h: 3.89, icon: "💧", isEmoji: true },
];

const SYMBOL_INDEX: Record<string, number> = {
  BTC: 0, ETH: 1, SOL: 2, BNB: 3, XRP: 4,
  ADA: 5, DOGE: 6, AVAX: 7, DOT: 8, LINK: 9,
  LTC: 10, ATOM: 11, NEAR: 12, APT: 13, SUI: 14,
};

const formatPrice = (price: number | undefined) => {
  const safePrice = Number(price);
  if (!Number.isFinite(safePrice)) return "—";
  if (safePrice >= 10000) return safePrice.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (safePrice >= 100) return safePrice.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  if (safePrice >= 1) return safePrice.toFixed(2);
  return safePrice.toFixed(4);
};

const formatChange = (change: number | undefined) => {
  const safeChange = Number(change);
  return Number.isFinite(safeChange) ? safeChange.toFixed(2) : "0.00";
};

const generateSparkline = (positive: boolean) => {
  const points: number[] = [];
  let y = 15;
  for (let i = 0; i < 20; i++) {
    y += (Math.random() - (positive ? 0.4 : 0.6)) * 4;
    y = Math.max(3, Math.min(27, y));
    points.push(y);
  }
  return points.map((p, i) => `${(i / 19) * 100},${p}`).join(" ");
};

const PriceCards = () => {
  const [prices, setPrices] = useState<CoinPrice[]>(FALLBACK_PRICES);

  useEffect(() => {
    const symbols = Object.keys(SYMBOL_INDEX);
    const fetchPrices = async () => {
      try {
        const liveMap = await fetchCryptoPricesEur(symbols);
        setPrices((prev) => {
          const updated = [...prev];
          for (const [sym, idx] of Object.entries(SYMBOL_INDEX)) {
            if (liveMap[sym] && Number.isFinite(liveMap[sym])) {
              const oldPrice = updated[idx].price;
              const change = oldPrice ? ((liveMap[sym] - oldPrice) / oldPrice) * 100 : 0;
              updated[idx] = {
                ...updated[idx],
                price: liveMap[sym],
                change24h: Number.isFinite(change) ? change : updated[idx].change24h,
              };
            }
          }
          return updated;
        });
      } catch { /* keep fallback */ }
    };
    fetchPrices();
    const interval = setInterval(() => {
      if (!document.hidden) fetchPrices();
    }, 90000);
    return () => clearInterval(interval);
  }, []);

  const tickerItems = [...prices, ...prices];

  return (
    <div className="w-full overflow-hidden bg-card border-b">
      <div className="flex animate-ticker">
        {tickerItems.map((coin, i) => {
          const positive = Number.isFinite(coin.change24h) ? coin.change24h >= 0 : true;
          const sparkline = generateSparkline(positive);
          return (
            <div
              key={`${coin.symbol}-${i}`}
              className="flex items-center gap-3 px-5 py-3 border-r border-border/50 min-w-[200px] shrink-0"
            >
              <div className="shrink-0">
                <div className="flex items-center gap-1.5">
                  {coin.isEmoji ? (
                    <span className="h-5 w-5 flex items-center justify-center text-sm">{coin.icon}</span>
                  ) : (
                    <img src={coin.icon} alt={coin.name} className="h-5 w-5 rounded-full" />
                  )}
                  <span className="font-semibold text-sm">{coin.symbol}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm text-foreground font-medium">€{formatPrice(coin.price)}</span>
                  <span className={`text-xs font-semibold ${positive ? "text-success" : "text-destructive"}`}>
                    {positive ? "+" : ""}{formatChange(coin.change24h)}%
                  </span>
                </div>
              </div>
              <div className="w-20 h-7 shrink-0">
                <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                  <polyline
                    points={sparkline}
                    fill="none"
                    stroke={positive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PriceCards;
