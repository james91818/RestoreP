import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";

const TradingViewTicker = memo(() => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "BITSTAMP:BTCEUR", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHEUR", title: "Ethereum" },
        { proName: "BINANCE:SOLEUR", title: "Solana" },
        { proName: "KRAKEN:XRPEUR", title: "XRP" },
        { proName: "BINANCE:BNBEUR", title: "BNB" },
        { proName: "BINANCE:DOGEEUR", title: "Dogecoin" },
        { proName: "NASDAQ:AAPL", title: "Apple" },
        { proName: "NASDAQ:TSLA", title: "Tesla" },
        { proName: "NASDAQ:NVDA", title: "NVIDIA" },
        { proName: "NASDAQ:AMZN", title: "Amazon" },
        { proName: "TVC:GOLD", title: "Gold" },
        { proName: "TVC:SILVER", title: "Silber" },
        { proName: "OANDA:SPX500EUR", title: "S&P 500" },
        { proName: "INDEX:DEU40", title: "DAX 40" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: theme,
      locale: "de_DE",
    });
    ref.current.appendChild(script);
  }, [theme]);

  return <div ref={ref} className="tradingview-widget-container" />;
});

TradingViewTicker.displayName = "TradingViewTicker";
export default TradingViewTicker;
