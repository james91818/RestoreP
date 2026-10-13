import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { resolveTradingViewSymbol } from "./symbolResolver";

interface Props {
  symbol: string;
  width?: string;
}

const TradingViewFundamentalData = memo(({ symbol, width = "100%" }: Props) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      isTransparent: true,
      largeChartUrl: "",
      displayMode: "regular",
      width,
      height: 420,
      colorTheme: theme,
      symbol: resolveTradingViewSymbol(symbol),
      locale: "de_DE",
    });
    ref.current.appendChild(script);
  }, [symbol]);

  return <div ref={ref} className="tradingview-widget-container overflow-hidden rounded-lg" />;
});

TradingViewFundamentalData.displayName = "TradingViewFundamentalData";
export default TradingViewFundamentalData;
