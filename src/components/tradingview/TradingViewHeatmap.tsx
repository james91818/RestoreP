import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  type?: "crypto" | "stock";
  height?: number;
}

const TradingViewHeatmap = memo(({ type = "crypto", height = 500 }: Props) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    
    if (type === "crypto") {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-crypto-coins-heatmap.js";
      script.innerHTML = JSON.stringify({
        dataSource: "Crypto",
        blockSize: "market_cap_calc",
        blockColor: "change",
        locale: "de_DE",
        symbolUrl: "",
        colorTheme: theme,
        hasTopBar: true,
        isDataSet498Enabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height,
      });
    } else {
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js";
      script.innerHTML = JSON.stringify({
        exchanges: [],
        dataSource: "SPX500",
        grouping: "sector",
        blockSize: "market_cap_basic",
        blockColor: "change",
        locale: "de_DE",
        symbolUrl: "",
        colorTheme: theme,
        hasTopBar: true,
        isDataSetEnabled: false,
        isZoomEnabled: true,
        hasSymbolTooltip: true,
        isMonoSize: false,
        width: "100%",
        height,
      });
    }

    script.type = "text/javascript";
    script.async = true;
    ref.current.appendChild(script);
  }, [type]);

  return <div ref={ref} className="tradingview-widget-container overflow-hidden rounded-lg" />;
});

TradingViewHeatmap.displayName = "TradingViewHeatmap";
export default TradingViewHeatmap;
