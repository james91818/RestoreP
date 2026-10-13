import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Gem, Shield, TrendingUp, Globe, Zap, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import PublicNav from "@/components/layout/PublicNav";

const commodities = ["XAU/EUR", "XAG/EUR", "WTI Öl", "Brent Öl", "Erdgas", "Kupfer", "Platin", "Palladium", "Weizen", "Kaffee", "Zucker", "Baumwolle"];

const benefits = [
  { icon: Gem, title: "Edelmetalle", desc: "Handeln Sie Gold, Silber, Platin und Palladium als sichere Hafen-Anlagen." },
  { icon: TrendingUp, title: "Energie", desc: "Profitieren Sie von Preisbewegungen bei Öl, Gas und anderen Energierohstoffen." },
  { icon: Globe, title: "Agrarrohstoffe", desc: "Diversifizieren Sie mit Weizen, Kaffee, Zucker und weiteren Rohstoffen." },
  { icon: Shield, title: "Inflationsschutz", desc: "Rohstoffe gelten traditionell als Absicherung gegen Inflation." },
];

const commodityPresets = [
  { label: "Gold (XAU)", lotSize: 100, unit: "oz", defaultPrice: 2350 },
  { label: "Silber (XAG)", lotSize: 5000, unit: "oz", defaultPrice: 29.5 },
  { label: "WTI Öl", lotSize: 1000, unit: "bbl", defaultPrice: 78 },
  { label: "Erdgas", lotSize: 10000, unit: "MMBtu", defaultPrice: 2.8 },
];

const CommodityCalculator = () => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [lots, setLots] = useState(0.1);
  const [entryPrice, setEntryPrice] = useState(commodityPresets[0].defaultPrice);
  const [exitPrice, setExitPrice] = useState(commodityPresets[0].defaultPrice * 1.02);

  const preset = commodityPresets[selectedPreset];

  const result = useMemo(() => {
    const contractValue = lots * preset.lotSize * entryPrice;
    const priceDiff = exitPrice - entryPrice;
    const pnl = lots * preset.lotSize * priceDiff;
    const margin = contractValue / 20; // assume 1:20 leverage
    const roi = margin > 0 ? (pnl / margin) * 100 : 0;
    return { contractValue, priceDiff, pnl, margin, roi };
  }, [lots, entryPrice, exitPrice, preset]);

  const handlePresetChange = (idx: number) => {
    setSelectedPreset(idx);
    setEntryPrice(commodityPresets[idx].defaultPrice);
    setExitPrice(Number((commodityPresets[idx].defaultPrice * 1.02).toFixed(2)));
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-[#3b82f6]" />
        </div>
        <div>
          <h3 className="text-xl font-display font-bold">Rohstoff-Rechner</h3>
          <p className="text-sm text-muted-foreground">Berechnen Sie Ihren Gewinn nach Lot-Größe und Preisänderung</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Rohstoff auswählen</label>
            <div className="grid grid-cols-2 gap-2">
              {commodityPresets.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => handlePresetChange(i)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedPreset === i
                      ? "border-[#3b82f6] bg-[#3b82f6]/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-[#3b82f6]/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Lot-Größe: {lots}</label>
            <Slider value={[lots]} onValueChange={v => setLots(v[0])} min={0.01} max={10} step={0.01} />
            <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0.01</span><span>10</span></div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Einstiegspreis ({preset.unit})</label>
            <Input type="number" value={entryPrice} onChange={e => setEntryPrice(Number(e.target.value))} min={0} step={0.01} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Ausstiegspreis ({preset.unit})</label>
            <Input type="number" value={exitPrice} onChange={e => setExitPrice(Number(e.target.value))} min={0} step={0.01} />
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-6 flex flex-col justify-center space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ergebnis — {preset.label}</h4>
          <div className="space-y-3">
            <div className="flex justify-between"><span className="text-muted-foreground">Kontraktwert</span><span className="font-semibold">${result.contractValue.toLocaleString("de-DE", { maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Geschätzte Margin</span><span className="font-semibold">${result.margin.toLocaleString("de-DE", { maximumFractionDigits: 2 })}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Preisänderung</span><span className="font-semibold">{result.priceDiff > 0 ? "+" : ""}{result.priceDiff.toLocaleString("de-DE", { maximumFractionDigits: 4 })}</span></div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg">
              <span className="font-medium">Gewinn / Verlust</span>
              <span className={`font-bold ${result.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {result.pnl >= 0 ? "+" : ""}${result.pnl.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="font-medium">ROI auf Margin</span>
              <span className={`font-bold ${result.roi >= 0 ? "text-green-500" : "text-red-500"}`}>
                {result.roi >= 0 ? "+" : ""}{result.roi.toFixed(2)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-2">* Berechnung basiert auf 1:20 Hebel. Tatsächliche Konditionen können abweichen.</p>
        </div>
      </div>
    </div>
  );
};

const InvestCommodities = () => (
  <div className="min-h-screen bg-background">
    <PublicNav />
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/investments"><ArrowLeft className="h-4 w-4 mr-2" /> Alle Anlageprodukte</Link>
      </Button>

      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-yellow-500/10 mb-4">
          <Gem className="h-8 w-8 text-yellow-500" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">Rohstoffe</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Diversifizieren Sie Ihr Portfolio mit Edelmetallen, Energie und Agrarrohstoffen. Gold, Silber, Öl und mehr — mit wettbewerbsfähigen Konditionen.
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
        <CommodityCalculator />
      </div>

      <h2 className="text-2xl font-display font-bold text-center mb-6">Verfügbare Rohstoffe</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-16">
        {commodities.map(c => (
          <div key={c} className="bg-card border border-border rounded-lg p-4 text-center font-semibold text-sm hover:border-[#3b82f6]/50 transition-colors">{c}</div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/5 p-8 text-center">
        <h2 className="text-2xl font-display font-bold mb-3">Jetzt Rohstoffe handeln</h2>
        <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Gold, Silber, Öl und mehr — starten Sie jetzt mit dem Rohstoffhandel.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-[#3b82f6] hover:bg-[#C4A030] text-black"><Link to="/signup">Kostenloses Konto eröffnen</Link></Button>
          <Button variant="outline" asChild><Link to="/account-types">Kontotypen ansehen</Link></Button>
        </div>
      </div>
    </div>
  </div>
);

export default InvestCommodities;
