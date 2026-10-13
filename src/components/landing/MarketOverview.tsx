import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  icon: string;
  type: "major" | "altcoin" | "defi" | "meme";
}

const ASSETS: MarketAsset[] = [
  // Major Coins
  { symbol: "BTC/EUR", name: "Bitcoin", price: 67432.18, change24h: 2.34, icon: "₿", type: "major" },
  { symbol: "ETH/EUR", name: "Ethereum", price: 3521.42, change24h: 1.87, icon: "Ξ", type: "major" },
  { symbol: "SOL/EUR", name: "Solana", price: 148.65, change24h: -0.92, icon: "◎", type: "major" },
  { symbol: "BNB/EUR", name: "BNB", price: 584.30, change24h: 0.45, icon: "⬡", type: "major" },
  { symbol: "XRP/EUR", name: "Ripple", price: 0.5234, change24h: -1.23, icon: "✕", type: "major" },
  { symbol: "TON/EUR", name: "Toncoin", price: 5.42, change24h: 1.15, icon: "◇", type: "major" },
  // Altcoins
  { symbol: "ADA/EUR", name: "Cardano", price: 0.4521, change24h: 3.12, icon: "₳", type: "altcoin" },
  { symbol: "DOT/EUR", name: "Polkadot", price: 6.89, change24h: 1.05, icon: "●", type: "altcoin" },
  { symbol: "AVAX/EUR", name: "Avalanche", price: 35.82, change24h: -2.14, icon: "▲", type: "altcoin" },
  { symbol: "ARB/EUR", name: "Arbitrum", price: 0.82, change24h: 2.41, icon: "◭", type: "altcoin" },
  { symbol: "OP/EUR", name: "Optimism", price: 1.65, change24h: -1.02, icon: "○", type: "altcoin" },
  { symbol: "SUI/EUR", name: "Sui", price: 1.24, change24h: 4.28, icon: "≈", type: "altcoin" },
  // DeFi
  { symbol: "UNI/EUR", name: "Uniswap", price: 8.42, change24h: 1.89, icon: "🦄", type: "defi" },
  { symbol: "AAVE/EUR", name: "Aave", price: 92.15, change24h: 2.05, icon: "👻", type: "defi" },
  { symbol: "LINK/EUR", name: "Chainlink", price: 14.23, change24h: 0.78, icon: "🔗", type: "defi" },
  { symbol: "LDO/EUR", name: "Lido", price: 1.82, change24h: -0.45, icon: "◆", type: "defi" },
  { symbol: "MKR/EUR", name: "MakerDAO", price: 2145.00, change24h: 1.32, icon: "Ⓜ", type: "defi" },
  { symbol: "CRV/EUR", name: "Curve", price: 0.42, change24h: -1.15, icon: "∫", type: "defi" },
  // Memecoins
  { symbol: "DOGE/EUR", name: "Dogecoin", price: 0.1245, change24h: 5.67, icon: "Ð", type: "meme" },
  { symbol: "SHIB/EUR", name: "Shiba Inu", price: 0.0000185, change24h: 3.12, icon: "🐕", type: "meme" },
  { symbol: "PEPE/EUR", name: "Pepe", price: 0.0000102, change24h: 8.45, icon: "🐸", type: "meme" },
  { symbol: "WIF/EUR", name: "dogwifhat", price: 2.31, change24h: -2.18, icon: "🎩", type: "meme" },
  { symbol: "BONK/EUR", name: "Bonk", price: 0.0000238, change24h: 6.72, icon: "🐶", type: "meme" },
  { symbol: "FLOKI/EUR", name: "Floki", price: 0.000165, change24h: 4.02, icon: "⚔", type: "meme" },
];

const formatPrice = (price: number) => {
  const safePrice = Number(price);
  if (!Number.isFinite(safePrice)) return "—";
  if (safePrice >= 1000) return `€${safePrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (safePrice >= 1) return `€${safePrice.toFixed(2)}`;
  return `€${safePrice.toFixed(4)}`;
};

const formatChange = (change: number) => {
  const safeChange = Number(change);
  return Number.isFinite(safeChange) ? safeChange.toFixed(2) : "0.00";
};

const AssetCard = ({ asset }: { asset: MarketAsset }) => {
  const safeChange = Number(asset.change24h);
  const isPositive = Number.isFinite(safeChange) ? safeChange >= 0 : false;

  return (
    <Card className="hover:shadow-md transition-all cursor-pointer group border hover:border-primary/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-lg">{asset.icon}</div>
            <div>
              <p className="font-semibold text-sm">{asset.symbol}</p>
              <p className="text-xs text-muted-foreground">{asset.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-lg font-display font-bold">{formatPrice(asset.price)}</span>
          <span className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? "text-success" : "text-destructive"}`}>
            {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {isPositive ? "+" : ""}{formatChange(asset.change24h)}%
          </span>
        </div>
        <div className="mt-3 h-8 w-full rounded overflow-hidden bg-muted/50">
          <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
            <path
              d={isPositive
                ? "M0,25 Q10,22 20,18 T40,15 T60,10 T80,8 T100,5"
                : "M0,5 Q10,8 20,12 T40,15 T60,20 T80,22 T100,25"}
              fill="none"
              stroke={isPositive ? "hsl(var(--success))" : "hsl(var(--destructive))"}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </CardContent>
    </Card>
  );
};

const MarketOverview = () => {
  const categories = [
    { value: "major", label: "Major Coins" },
    { value: "altcoin", label: "Altcoins" },
    { value: "defi", label: "DeFi" },
    { value: "meme", label: "Memecoins" },
  ] as const;

  return (
    <Tabs defaultValue="major" className="w-full">
      <TabsList className="mb-4">
        {categories.map((cat) => (
          <TabsTrigger key={cat.value} value={cat.value}>{cat.label}</TabsTrigger>
        ))}
      </TabsList>
      {categories.map((cat) => (
        <TabsContent key={cat.value} value={cat.value}>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {ASSETS.filter((a) => a.type === cat.value).map((asset) => (
              <AssetCard key={asset.symbol} asset={asset} />
            ))}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default MarketOverview;
