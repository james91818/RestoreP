import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  height?: number;
}

const TradingViewMarketOverview = memo(({ height = 400 }: Props) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-quotes.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      width: "100%",
      height,
      symbolsGroups: [
        {
          name: "Krypto",
          symbols: [
            { name: "BITSTAMP:BTCEUR", displayName: "Bitcoin" },
            { name: "BITSTAMP:ETHEUR", displayName: "Ethereum" },
            { name: "BINANCE:SOLEUR", displayName: "Solana" },
            { name: "KRAKEN:XRPEUR", displayName: "XRP" },
            { name: "BINANCE:DOGEEUR", displayName: "Dogecoin" },
          ],
        },
        {
          name: "Aktien",
          symbols: [
            { name: "NASDAQ:AAPL", displayName: "Apple" },
            { name: "NASDAQ:TSLA", displayName: "Tesla" },
            { name: "NASDAQ:NVDA", displayName: "NVIDIA" },
            { name: "NASDAQ:AMZN", displayName: "Amazon" },
            { name: "NASDAQ:MSFT", displayName: "Microsoft" },
          ],
        },
        {
          name: "Indizes",
          symbols: [
            { name: "OANDA:SPX500EUR", displayName: "S&P 500" },
            { name: "INDEX:DEU40", displayName: "DAX 40" },
            { name: "OANDA:NAS100EUR", displayName: "NASDAQ 100" },
          ],
        },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      colorTheme: theme,
      locale: "de_DE",
    });
    ref.current.appendChild(script);
  }, [theme]);

  return <div ref={ref} className="tradingview-widget-container rounded-lg overflow-hidden" />;
});

TradingViewMarketOverview.displayName = "TradingViewMarketOverview";
export default TradingViewMarketOverview;
