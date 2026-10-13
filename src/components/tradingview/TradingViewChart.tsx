import { useEffect, useRef, useState, memo } from "react";
import { useTheme } from "@/hooks/useTheme";
import { resolveTradingViewSymbol } from "./symbolResolver";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  symbol: string;
  height?: number;
  autosize?: boolean;
}

const TradingViewChart = memo(({ symbol, height = 400, autosize = true }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const [showSideToolbar, setShowSideToolbar] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    const resolved = resolveTradingViewSymbol(symbol);
    const isIndex = /^(TVC|INDEX|FOREXCOM|OANDA|FXOPEN|FTSE|NASDAQ):/i.test(resolved) &&
      /(SPX|NDX|DJI|DEU40|UKX|NKY|NI225|CAC40|FCHI|SX5E|STOXX50E|SPX500|NAS100)/i.test(resolved);
    script.innerHTML = JSON.stringify({
      autosize,
      symbol: resolved,
      interval: isIndex ? "D" : "60",
      timezone: "Europe/Berlin",
      theme: theme === "dark" ? "dark" : "light",
      style: "1",
      locale: "de_DE",
      allow_symbol_change: false,
      hide_top_toolbar: false,
      hide_side_toolbar: !showSideToolbar,
      withdateranges: true,
      details: false,
      hotlist: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: "https://www.tradingview.com",
      backgroundColor: "rgba(0, 0, 0, 0)",
      gridColor: "rgba(212, 175, 55, 0.04)",
      ...(autosize ? {} : { height }),
    });

    containerRef.current.appendChild(script);
  }, [symbol, theme, showSideToolbar, autosize, height]);

  return (
    <div className="relative h-full w-full">
      <div
        className="tradingview-widget-container rounded-lg overflow-hidden"
        ref={containerRef}
        style={{ height: autosize ? "100%" : height, minHeight: 300 }}
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setShowSideToolbar((v) => !v)}
        className="absolute top-2 left-2 z-10 h-8 w-8 p-0 rounded-md shadow-md"
        title={showSideToolbar ? "Werkzeuge ausblenden" : "Werkzeuge einblenden"}
      >
        <Pencil className="h-4 w-4" />
      </Button>
    </div>
  );
});

TradingViewChart.displayName = "TradingViewChart";
export default TradingViewChart;
