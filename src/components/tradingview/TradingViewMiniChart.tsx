import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { resolveTradingViewSymbol } from "./symbolResolver";

interface Props {
  symbol: string;
  width?: string | number;
  height?: number;
}

const TradingViewMiniChart = memo(({ symbol, width = "100%", height = 220 }: Props) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: resolveTradingViewSymbol(symbol),
      width: typeof width === "number" ? `${width}` : width,
      height,
      locale: "de_DE",
      dateRange: "1M",
      colorTheme: theme,
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      noTimeScale: false,
      chartOnly: false,
    });
    ref.current.appendChild(script);
  }, [symbol]);

  return <div ref={ref} className="tradingview-widget-container overflow-hidden rounded-lg" />;
});

TradingViewMiniChart.displayName = "TradingViewMiniChart";
export default TradingViewMiniChart;
