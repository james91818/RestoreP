import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, LineChart, Shield, TrendingUp, Globe, Zap, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import PublicNav from "@/components/layout/PublicNav";

const indices = ["NAS100", "US30", "S&P 500", "GER40", "UK100", "JPN225", "AUS200", "FRA40", "ESP35", "HK50", "EU50", "CHINA50"];

const benefits = [
  { icon: Globe, title: "Globale Indizes", desc: "Handeln Sie die wichtigsten Marktindizes aus den USA, Europa und Asien." },
  { icon: TrendingUp, title: "Breite Exposition", desc: "Mit einer Position erfassen Sie die Performance ganzer Märkte." },
  { icon: Shield, title: "Niedrige Spreads", desc: "Wettbewerbsfähige Konditionen auf alle großen Indizes." },
  { icon: Zap, title: "Hebel bis 1:100", desc: "Flexibler Hebel für verschiedene Handelsstrategien." },
];

const IndicesCalculator = () => {
  const [margin, setMargin] = useState(500);
  const [leverage, setLeverage] = useState(20);
  const [entryPoints, setEntryPoints] = useState(18000);
  const [exitPoints, setExitPoints] = useState(18250);
  const [contractSize, setContractSize] = useState(1);

  const result = useMemo(() => {
    const positionValue = margin * leverage;
    const pointsDiff = exitPoints - entryPoints;
    const pointValue = positionValue / entryPoints;
    const pnl = pointsDiff * pointValue * contractSize;
    const roi = (pnl / margin) * 100;
    return { positionValue, pointsDiff, pointValue, pnl, roi };
  }, [margin, leverage, entryPoints, exitPoints, contractSize]);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-[#3b82f6]" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold">Index-CFD-Rechner</h3>
          <p className="text-sm text-muted-foreground">Berechnen Sie Ihren Gewinn basierend auf Punkteänderung</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Margin / Einsatz (€)</label>
            <Input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Hebel: 1:{leverage}</label>
            <Slider value={[leverage]} onValueChange={v => setLeverage(v[0])} min={1} max={100} step={1} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>1x</span><span>100x</span></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Einstieg (Punkte)</label>
            <Input type="number" value={entryPoints} onChange={e => setEntryPoints(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ausstieg (Punkte)</label>
            <Input type="number" value={exitPoints} onChange={e => setExitPoints(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Kontraktgröße: {contractSize}</label>
            <Slider value={[contractSize]} onValueChange={v => setContractSize(v[0])} min={0.1} max={10} step={0.1} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0.1</span><span>10</span></div>
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-6 flex flex-col justify-center space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ergebnis</h4>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Positionswert</span><span className="font-semibold">€{result.positionValue.toLocaleString("de-DE")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Punkteänderung</span><span className="font-semibold">{result.pointsDiff > 0 ? "+" : ""}{result.pointsDiff.toLocaleString("de-DE")} Pkt.</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Punktwert</span><span className="font-semibold">€{result.pointValue.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span></div>
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
          <p className="text-xs text-muted-foreground pt-2">* Dieses Ergebnis dient nur zur Veranschaulichung. Spread und Gebühren nicht enthalten.</p>
        </div>
      </div>
    </div>
  );
};

const InvestIndices = () => (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/investments"><ArrowLeft className="h-4 w-4 mr-2" /> Alle Anlageprodukte</Link>
      </Button>

      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-500/10 mb-4">
          <LineChart className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Indizes</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Verfolgen und handeln Sie die weltweit führenden Marktindizes wie S&P 500, NASDAQ und DAX. Breite Marktexposition mit einer einzigen Position.
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
        <IndicesCalculator />
      </div>

      <h2 className="text-2xl font-display font-bold text-center mb-6">Verfügbare Indizes</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-16">
        {indices.map(i => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 text-center font-semibold text-sm hover:border-[#3b82f6]/50 transition-colors">{i}</div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-8 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">Jetzt Indizes handeln</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Starten Sie mit dem Handel der wichtigsten globalen Indizes.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-[#3b82f6] hover:bg-[#C4A030] text-black"><Link to="/signup">Kostenloses Konto eröffnen</Link></Button>
          <Button variant="outline" asChild><Link to="/account-types">Kontotypen ansehen</Link></Button>
        </div>
      </div>
    </div>
  </div>
);

export default InvestIndices;
