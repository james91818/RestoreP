import { useEffect, useRef } from "react";
import { AnimatedSection } from "./AnimatedSection";

const MarketWidget = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Clear any existing widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: "dark",
      dateRange: "12M",
      showChart: true,
      locale: "de_DE",
      largeChartUrl: "",
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      width: "100%",
      height: "550",
      plotLineColorGrowing: "rgba(212, 175, 55, 1)",
      plotLineColorFalling: "rgba(220, 38, 38, 1)",
      gridLineColor: "rgba(212, 175, 55, 0.06)",
      scaleFontColor: "rgba(156, 163, 175, 1)",
      belowLineFillColorGrowing: "rgba(212, 175, 55, 0.06)",
      belowLineFillColorFalling: "rgba(220, 38, 38, 0.04)",
      belowLineFillColorGrowingBottom: "rgba(212, 175, 55, 0)",
      belowLineFillColorFallingBottom: "rgba(220, 38, 38, 0)",
      symbolActiveColor: "rgba(212, 175, 55, 0.12)",
      tabs: [
        {
          title: "Major Coins",
          symbols: [
            { s: "BITSTAMP:BTCEUR", d: "Bitcoin" },
            { s: "BITSTAMP:ETHEUR", d: "Ethereum" },
            { s: "BINANCE:SOLEUR", d: "Solana" },
            { s: "KRAKEN:XRPEUR", d: "XRP" },
            { s: "BINANCE:BNBEUR", d: "BNB" },
            { s: "BINANCE:TONEUR", d: "Toncoin" },
          ],
        },
        {
          title: "Altcoins",
          symbols: [
            { s: "KRAKEN:ADAEUR", d: "Cardano" },
            { s: "BINANCE:DOTEUR", d: "Polkadot" },
            { s: "BINANCE:AVAXEUR", d: "Avalanche" },
            { s: "BINANCE:ARBEUR", d: "Arbitrum" },
            { s: "BINANCE:OPEUR", d: "Optimism" },
            { s: "BINANCE:SUIEUR", d: "Sui" },
          ],
        },
        {
          title: "DeFi",
          symbols: [
            { s: "BINANCE:UNIEUR", d: "Uniswap" },
            { s: "BINANCE:AAVEEUR", d: "Aave" },
            { s: "BINANCE:LINKEUR", d: "Chainlink" },
            { s: "BINANCE:LDOEUR", d: "Lido" },
            { s: "BINANCE:MKREUR", d: "MakerDAO" },
          ],
        },
        {
          title: "Memecoins",
          symbols: [
            { s: "BINANCE:DOGEEUR", d: "Dogecoin" },
            { s: "BINANCE:SHIBEUR", d: "Shiba Inu" },
            { s: "BINANCE:PEPEEUR", d: "Pepe" },
            { s: "BINANCE:WIFEUR", d: "dogwifhat" },
            { s: "BINANCE:BONKEUR", d: "Bonk" },
          ],
        },
      ],
    });
    containerRef.current.appendChild(script);
  }, []);

  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <AnimatedSection className="text-center mb-10 space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-[#3b82f6] font-semibold">Live Märkte</p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display-landing font-bold text-[hsl(var(--l-fg))]">
            Echtzeit-Marktübersicht
          </h2>
          <p className="text-[hsl(var(--l-fg-mid))] text-lg max-w-2xl mx-auto">
            Verfolgen Sie aktuelle Kurse und Trends der wichtigsten Märkte weltweit — direkt auf unserer Plattform.
          </p>
        </AnimatedSection>

        <div className="max-w-5xl mx-auto rounded-2xl border border-[#3b82f6]/10 overflow-hidden bg-[hsl(var(--l-card-bg)/0.04)]">
          <div className="tradingview-widget-container" ref={containerRef} />
        </div>

        <p className="text-center text-xs text-[hsl(var(--l-fg-low))] mt-4">
          Marktdaten bereitgestellt von TradingView
        </p>
      </div>
    </section>
  );
};

export default MarketWidget;
