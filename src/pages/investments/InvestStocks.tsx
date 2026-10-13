import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BarChart3, Shield, TrendingUp, Globe, Zap, CheckCircle2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import PublicNav from "@/components/layout/PublicNav";

const stocks = ["AAPL", "TSLA", "AMZN", "MSFT", "GOOGL", "META", "NVDA", "NFLX", "AMD", "JPM", "V", "DIS"];

const benefits = [
  { icon: Globe, title: "Globale Aktien", desc: "Handeln Sie Aktien aus den USA, Europa und Asien — alles auf einer Plattform." },
  { icon: TrendingUp, title: "CFD-Handel", desc: "Profitieren Sie von steigenden und fallenden Kursen mit flexiblem Hebel." },
  { icon: Shield, title: "Reguliert & sicher", desc: "Getrennte Kundengelder und modernste Sicherheitsstandards." },
  { icon: Zap, title: "Schnelle Ausführung", desc: "Orders werden in unter 30ms ohne Re-Quotes ausgeführt." },
];

const StockCalculator = () => {
  const [shares, setShares] = useState(50);
  const [buyPrice, setBuyPrice] = useState(150);
  const [sellPrice, setSellPrice] = useState(175);
  const [dividendYield, setDividendYield] = useState(1.5);
  const [holdingMonths, setHoldingMonths] = useState(12);

  const result = useMemo(() => {
    const totalInvested = shares * buyPrice;
    const capitalGain = shares * (sellPrice - buyPrice);
    const annualDividend = totalInvested * (dividendYield / 100);
    const dividendEarned = annualDividend * (holdingMonths / 12);
    const totalReturn = capitalGain + dividendEarned;
    const roi = (totalReturn / totalInvested) * 100;
    return { totalInvested, capitalGain, dividendEarned, totalReturn, roi };
  }, [shares, buyPrice, sellPrice, dividendYield, holdingMonths]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-[#3b82f6]" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold">Aktien-Renditerechner</h3>
          <p className="text-sm text-muted-foreground">Berechnen Sie Kursgewinne und Dividendenrendite</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Anzahl Aktien</label>
            <Input type="number" value={shares} onChange={e => setShares(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kaufpreis pro Aktie (€)</label>
            <Input type="number" value={buyPrice} onChange={e => setBuyPrice(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Verkaufspreis pro Aktie (€)</label>
            <Input type="number" value={sellPrice} onChange={e => setSellPrice(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Dividendenrendite: {dividendYield}%</label>
            <Slider value={[dividendYield]} onValueChange={v => setDividendYield(v[0])} min={0} max={10} step={0.1} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0%</span><span>10%</span></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Haltedauer: {holdingMonths} Monate</label>
            <Slider value={[holdingMonths]} onValueChange={v => setHoldingMonths(v[0])} min={1} max={60} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1 Mo.</span><span>60 Mo.</span></div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-6 flex flex-col justify-center space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ergebnis</h4>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Gesamtinvestition</span><span className="font-semibold">€{result.totalInvested.toLocaleString("de-DE")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Kursgewinn</span><span className={`font-semibold ${result.capitalGain >= 0 ? "text-green-500" : "text-red-500"}`}>{result.capitalGain >= 0 ? "+" : ""}€{result.capitalGain.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dividenden</span><span className="font-semibold text-green-500">+€{result.dividendEarned.toLocaleString("de-DE", { minimumFractionDigits: 2 })}</span></div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg">
              <span className="font-medium">Gesamtrendite</span>
              <span className={`font-bold ${result.totalReturn >= 0 ? "text-green-500" : "text-red-500"}`}>
                {result.totalReturn >= 0 ? "+" : ""}€{result.totalReturn.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-medium">ROI</span>
              <span className={`font-bold ${result.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                {result.roi >= 0 ? "+" : ""}{result.roi.toFixed(2)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">* Dieses Ergebnis dient nur zur Veranschaulichung. Gebühren und Steuern nicht berücksichtigt.</p>
        </div>
      </div>
    </div>
  );
};

const InvestStocks = () => (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/investments"><ArrowLeft className="h-4 w-4 mr-2" /> Alle Anlageprodukte</Link>
      </Button>

      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-500/10 mb-4">
          <BarChart3 className="h-8 w-8 text-blue-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Aktien</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Investieren Sie in die wertvollsten Unternehmen der Welt. Handeln Sie CFDs auf Apple, Tesla, Amazon und viele mehr — mit wettbewerbsfähigen Spreads.
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
        <StockCalculator />
      </div>

      <h2 className="text-2xl font-display font-bold text-center mb-6">Beliebte Aktien</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-16">
        {stocks.map(s => (
          <div key={s} className="bg-card border border-border rounded-lg p-4 text-center font-semibold text-sm hover:border-[#3b82f6]/50 transition-colors">{s}</div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-8 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">Jetzt Aktien handeln</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Eröffnen Sie Ihr Konto und erhalten Sie Zugang zu globalen Aktienmärkten.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-[#3b82f6] hover:bg-[#C4A030] text-black"><Link to="/signup">Kostenloses Konto eröffnen</Link></Button>
          <Button variant="outline" asChild><Link to="/account-types">Kontotypen ansehen</Link></Button>
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Ab €250 Mindesteinlage</span>
          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Über 200 Aktien</span>
        </div>
      </div>
    </div>
  </div>
);

export default InvestStocks;
