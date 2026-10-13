import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bitcoin, Shield, Zap, Clock, TrendingUp, CheckCircle2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import PublicNav from "@/components/layout/PublicNav";

const pairs = ["BTC/EUR", "ETH/EUR", "SOL/EUR", "XRP/EUR", "ADA/EUR", "DOT/EUR", "DOGE/EUR", "AVAX/EUR", "LINK/EUR", "MATIC/EUR", "BNB/EUR", "LTC/EUR"];

const benefits = [
  { icon: Clock, title: "24/7 Handel", desc: "Kryptomärkte schlafen nie — handeln Sie rund um die Uhr, auch am Wochenende." },
  { icon: Zap, title: "Bis zu 1:100 Hebel", desc: "Verstärken Sie Ihre Positionen mit flexiblem Hebel nach Ihrem Risikoprofil." },
  { icon: Shield, title: "Sichere Verwahrung", desc: "Ihre Gelder werden in getrennten Konten bei erstklassigen Banken verwahrt." },
  { icon: TrendingUp, title: "Über 50 Coins", desc: "Bitcoin, Ethereum, Solana und viele weitere Altcoins — alles auf einer Plattform." },
];

const CryptoCalculator = () => {
  const [investment, setInvestment] = useState(1000);
  const [leverage, setLeverage] = useState(10);
  const [entryPrice, setEntryPrice] = useState(65000);
  const [exitPrice, setExitPrice] = useState(68000);

  const result = useMemo(() => {
    const positionSize = investment * leverage;
    const priceChange = ((exitPrice - entryPrice) / entryPrice) * 100;
    const pnl = positionSize * (priceChange / 100) * 8;
    const roi = (pnl / investment) * 100;
    return { positionSize, priceChange, pnl, roi };
  }, [investment, leverage, entryPrice, exitPrice]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-[#3b82f6]" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold">Krypto-Gewinnrechner</h3>
          <p className="text-sm text-muted-foreground">Berechnen Sie Ihren potenziellen Gewinn mit Hebel</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Investitionsbetrag (€)</label>
            <Input type="number" value={investment} onChange={e => setInvestment(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Hebel: 1:{leverage}</label>
            <Slider value={[leverage]} onValueChange={v => setLeverage(v[0])} min={1} max={100} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1x</span><span>100x</span></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Einstiegspreis (USD)</label>
            <Input type="number" value={entryPrice} onChange={e => setEntryPrice(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ausstiegspreis (USD)</label>
            <Input type="number" value={exitPrice} onChange={e => setExitPrice(Number(e.target.value))} min={0} />
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-6 flex flex-col justify-center space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ergebnis</h4>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Positionsgröße</span><span className="font-semibold">€{result.positionSize.toLocaleString("de-DE")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Preisänderung</span><span className="font-semibold">{result.priceChange.toFixed(2)}%</span></div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg">
              <span className="font-medium">Gewinn / Verlust</span>
              <span className={`font-bold ${result.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {result.pnl >= 0 ? "+" : ""}€{result.pnl.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-medium">ROI</span>
              <span className={`font-bold ${result.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                {result.roi >= 0 ? "+" : ""}{result.roi.toFixed(2)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">* Dieses Ergebnis dient nur zur Veranschaulichung. Tatsächliche Ergebnisse können abweichen.</p>
        </div>
      </div>
    </div>
  );
};

const InvestCrypto = () => (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/investments"><ArrowLeft className="h-4 w-4 mr-2" /> Alle Anlageprodukte</Link>
      </Button>

      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 mb-4">
          <Bitcoin className="h-8 w-8 text-amber-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Kryptowährungen</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Handeln Sie die beliebtesten digitalen Vermögenswerte — von Bitcoin bis Solana. Profitieren Sie von 24/7 Marktzugang, niedrigen Spreads und bis zu 1:100 Hebel.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {benefits.map(b => (
          <div key={b.title} className="p-6 rounded-xl border border-border bg-card text-center">
            <div className="h-12 w-12 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center mx-auto mb-3">
              <b.icon className="h-6 w-6 text-[#3b82f6]" />
            </div>
            <h3 className="font-semibold mb-1">{b.title}</h3>
            <p className="text-sm text-muted-foreground">{b.desc}</p>
          </div>
        ))}
      </div>

      <div className="mb-16">
        <CryptoCalculator />
      </div>

      <h2 className="text-2xl font-display font-bold text-center mb-6">Verfügbare Handelspaare</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-16">
        {pairs.map(p => (
          <div key={p} className="bg-card border border-border rounded-lg p-4 text-center font-semibold text-sm hover:border-[#3b82f6]/50 transition-colors">{p}</div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-8 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">Jetzt Kryptowährungen handeln</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Eröffnen Sie Ihr Konto in wenigen Minuten und starten Sie sofort.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-[#3b82f6] hover:bg-[#C4A030] text-black"><Link to="/signup">Kostenloses Konto eröffnen</Link></Button>
          <Button variant="outline" asChild><Link to="/account-types">Kontotypen ansehen</Link></Button>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Keine Mindesteinlage</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> 24/7 Handel</span>
        </div>
      </div>
    </div>
  </div>
);

export default InvestCrypto;
