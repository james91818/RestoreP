import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  market?: "crypto" | "america" | "germany";
  height?: number;
}

const TradingViewScreener = memo(({ market = "crypto", height = 500 }: Props) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    script.type = "text/javascript";
    script.async = true;

    const config: Record<string, any> = {
      width: "100%",
      height,
      defaultColumn: "overview",
      defaultScreen: market === "crypto" ? "crypto_signal_strong_buy" : "most_capitalized",
      showToolbar: true,
      locale: "de_DE",
      colorTheme: theme,
      isTransparent: true,
    };

    if (market === "crypto") {
      config.market = "crypto";
    } else if (market === "germany") {
      config.market = "germany";
    } else {
      config.market = "america";
    }

    script.innerHTML = JSON.stringify(config);
    ref.current.appendChild(script);
  }, [market]);

  return <div ref={ref} className="tradingview-widget-container overflow-hidden rounded-lg" />;
});

TradingViewScreener.displayName = "TradingViewScreener";
export default TradingViewScreener;
