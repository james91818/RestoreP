import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Props {
  height?: number;
}

const TradingViewCalendar = memo(({ height = 500 }: Props) => {
  const { theme } = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: theme,
      isTransparent: true,
      width: "100%",
      height,
      locale: "de_DE",
      importanceFilter: "-1,0,1",
      countryFilter: "us,eu,de,gb,jp,cn",
    });
    ref.current.appendChild(script);
  }, [theme]);

  return <div ref={ref} className="tradingview-widget-container overflow-hidden rounded-lg" />;
});

TradingViewCalendar.displayName = "TradingViewCalendar";
export default TradingViewCalendar;
