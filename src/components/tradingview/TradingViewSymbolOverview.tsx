import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  symbols?: { s: string; d: string }[];
  height?: number;
}

const defaultSymbols = [
  { s: "BITSTAMP:BTCEUR", d: "Bitcoin" },
  { s: "BITSTAMP:ETHEUR", d: "Ethereum" },
  { s: "BINANCE:SOLEUR", d: "Solana" },
  { s: "KRAKEN:XRPEUR", d: "XRP" },
  { s: "NASDAQ:AAPL", d: "Apple" },
  { s: "NASDAQ:TSLA", d: "Tesla" },
  { s: "NASDAQ:NVDA", d: "NVIDIA" },
  { s: "TVC:GOLD", d: "Gold" },
  { s: "OANDA:SPX500EUR", d: "S&P 500" },
  { s: "INDEX:DEU40", d: "DAX 40" },
];

const TradingViewSymbolOverview = memo(({ symbols = defaultSymbols, height = 400 }: Props) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: symbols.map(s => [s.d, `${s.s}|1D`]),
      chartOnly: false,
      width: "100%",
      height,
      locale: "de_DE",
      colorTheme: theme,
      autosize: false,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      lineWidth: 2,
      lineType: 0,
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M"],
      isTransparent: true,
    });
    ref.current.appendChild(script);
  }, [theme]);

  return <div ref={ref} className="tradingview-widget-container overflow-hidden rounded-lg" />;
});

TradingViewSymbolOverview.displayName = "TradingViewSymbolOverview";
export default TradingViewSymbolOverview;
